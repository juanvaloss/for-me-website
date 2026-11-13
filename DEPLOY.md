# Guía de despliegue: AWS + CI/CD con GitHub Actions

Al terminar esta guía tendrás la tienda en internet y un flujo automático: **cada
vez que hagas push a `main`, GitHub corre las pruebas y, si pasan, despliega a AWS.**
Los pull requests solo corren las pruebas.

No necesitas instalar nada en tu computadora para desplegar: todo se hace desde
el navegador (consola de AWS, GitHub y Google Cloud).

```
push a main ──▶ GitHub Actions ──▶ pruebas (API + tienda)
                                     │ si pasan
                                     ▼
                       deploy con credenciales temporales (OIDC)
                                     │
                 ┌───────────────────┴────────────────────┐
                 ▼                                        ▼
     stack forme-api (Lambda + Aurora)       stack forme-web (S3 + CloudFront)
```

## Contenido

1. [Cuánto cuesta](#1-cuánto-cuesta)
2. [Crear la cuenta de AWS](#2-crear-la-cuenta-de-aws)
3. [Darle permiso a GitHub para desplegar](#3-darle-permiso-a-github-para-desplegar)
4. [Configurar el repositorio en GitHub](#4-configurar-el-repositorio-en-github)
5. [Primer despliegue](#5-primer-despliegue)
6. [Crear el usuario administrador](#6-crear-el-usuario-administrador)
7. [Activar "Continuar con Google"](#7-activar-continuar-con-google)
8. [El día a día](#8-el-día-a-día)
9. [Mantener el costo bajo](#9-mantener-el-costo-bajo)
10. [Problemas comunes](#10-problemas-comunes)
11. [Borrar todo](#11-borrar-todo)
12. [Alternativa: desplegar desde tu computadora](#12-alternativa-desplegar-desde-tu-computadora)

---

## 1. Cuánto cuesta

La arquitectura está pensada para costar lo menos posible:

| Pieza | Costo mensual aproximado |
| --- | --- |
| GitHub Actions (pruebas y deploys) | **$0** en repositorios públicos |
| CloudFront, Lambda, EventBridge | **$0** dentro de los límites gratuitos permanentes |
| Credenciales de GitHub (OIDC), secretos (SSM Parameter Store), endpoint de S3 | **$0** |
| S3 (la tienda, llaves de Google, paquetes del deploy) | centavos |
| Aurora Serverless v2 (base de datos) | **$0 mientras está en pausa**; ~US$0.06 por hora despierta, + US$0.10 por GB al mes |
| CloudWatch Logs (14 días) | centavos |

**Total esperado para una tienda pequeña: US$1–5 al mes**, casi todo por las horas
en que la base de datos está despierta.

Lo que deliberadamente **no** usamos porque suele ser el costo escondido: NAT
Gateway (~US$33/mes), Secrets Manager, API Gateway, balanceadores de carga,
CodePipeline/CodeBuild.

> Si algún día haces el repositorio privado, GitHub Free incluye US$12 al mes de
> cómputo (unos 2,000 minutos de Linux). Cada push a `main` consume unos 15
> minutos sumando sus tres jobs, así que alcanza para más de 100 deploys al mes.

---

## 2. Crear la cuenta de AWS

1. Entra a <https://aws.amazon.com> → **Create an AWS account**. Necesitas un
   correo, una tarjeta y un teléfono.
2. Cuando te pregunte el plan, **elige _Paid plan_ (plan de pago)**. Con él también
   recibes los créditos de bienvenida (hasta US$200), pero tu cuenta no se cierra
   sola. El _Free plan_ cierra la cuenta a los 6 meses, o antes si se acaban los
   créditos, y la tienda dejaría de funcionar.
3. **Protege el usuario raíz:** arriba a la derecha → tu nombre → **Security
   credentials** → **Assign MFA device** (usa una app como Google Authenticator).
4. **Crea una alerta de gasto** (las alertas son gratis): busca **Budgets** →
   **Create budget** → **Use a template** → **Monthly cost budget** → monto
   `10` USD → tu correo → **Create budget**. Te avisará si algo se sale de lo normal.
5. Arriba a la derecha elige la región **US East (N. Virginia) `us-east-1`**. Todo
   el proyecto vive ahí.

> Recomendado: para el uso diario crea un usuario administrador con **IAM Identity
> Center** (gratis) y deja el usuario raíz solo para facturación.

---

## 3. Darle permiso a GitHub para desplegar

GitHub no guarda llaves de AWS. En su lugar, AWS confía en GitHub mediante
**OpenID Connect**: en cada deploy, GitHub recibe credenciales que caducan en
2 horas, y solo si el workflow corre en `main` de **este** repositorio.

1. En la consola de AWS busca **CloudFormation** → **Create stack** → **With new
   resources (standard)**.
2. **Choose an existing template** → **Upload a template file** → elige
   `infra/github-deploy-role.yaml` de este repositorio → **Next**.
3. **Stack name:** `forme-github`. Deja los parámetros como están:
   - `GitHubSubject` ya trae tu repositorio (`juanvaloss/for-me-website`) con sus
     IDs. Solo cámbialo si renombras, transfieres o haces fork del repo (el formato
     viene explicado en el campo).
   - `CreateOidcProvider`: `true`. Usa `false` solo si tu cuenta ya tenía GitHub
     configurado como proveedor de identidad.
4. **Next** → **Next** → marca **I acknowledge that AWS CloudFormation might
   create IAM resources** → **Submit**.
5. Espera a que diga `CREATE_COMPLETE` (1 minuto) → pestaña **Outputs** → copia el
   valor de **RoleArn** (algo como `arn:aws:iam::123456789012:role/forme-github-DeployRole-…`).

> ¿Por qué el rol tiene permisos de administrador? El deploy crea roles de IAM,
> redes, la base de datos y la CDN, y cualquier rol que pueda crear roles de IAM
> equivale en la práctica a un administrador. La protección real está en la
> política de confianza: solo un workflow que corre en `main` de tu repositorio,
> identificado por sus IDs inmutables, puede usarlo. Nadie más, ni siquiera un
> pull request de otra persona, puede asumirlo.

---

## 4. Configurar el repositorio en GitHub

En GitHub: tu repo → **Settings** → **Secrets and variables** → **Actions** →
pestaña **Variables** → **New repository variable**. Crea:

| Nombre | Valor |
| --- | --- |
| `AWS_ROLE_ARN` | El **RoleArn** del paso anterior |
| `AWS_REGION` | `us-east-1` |
| `GOOGLE_CLIENT_ID` | Déjala para después ([paso 7](#7-activar-continuar-con-google)) |

**No hace falta crear ningún _secret_ en GitHub.** Las contraseñas de la base de
datos, la `SECRET_KEY` de Django y el secreto entre CloudFront y la API se generan
solos en el primer deploy. Se guardan cifrados en **SSM Parameter Store** (gratis),
dentro de tu cuenta de AWS, y los deploys siguientes reutilizan los mismos. En los
logs de GitHub aparecen enmascarados como `***`.

> Mientras `AWS_ROLE_ARN` no exista, el job de deploy simplemente se salta: puedes
> subir el código antes de configurar AWS sin que nada falle.

Opcional pero recomendado: **Settings → Branches → Add branch ruleset** sobre `main`
con **Require status checks to pass** (`API checks` y `Storefront checks`). Así
nada llega a `main` sin pasar las pruebas.

---

## 5. Primer despliegue

1. Sube a `main` el código con estos cambios (`git push`).
2. En GitHub → pestaña **Actions** → workflow **CI/CD** → **Run workflow** →
   rama `main` → **marca "Load the Drop 01 catalog"** → **Run workflow**.
3. Espera. **El primer deploy tarda 25–40 minutos**, porque AWS crea la base de
   datos y la CDN desde cero. Los siguientes tardan unos 8–10 minutos.
4. Al terminar, el resumen del run muestra las direcciones:
   - Tienda: `https://dxxxxxxxxxxxxx.cloudfront.net`
   - Admin: `https://dxxxxxxxxxxxxx.cloudfront.net/api/admin/`

La casilla del catálogo carga los productos y el stock del 12-oct-2026
(`server/store/data/catalog.json`). **Úsala solo en el primer deploy**, porque
sobrescribe el stock. Después, el stock se maneja desde el admin. Si el primer
deploy corrió solo por un push (sin la casilla), corre el manual con la casilla
marcada una vez.

> La primera visita después de un rato sin tráfico tarda unos 15 segundos: la base
> de datos estaba en pausa y está despertando. Es normal y es lo que la hace barata.

---

## 6. Crear el usuario administrador

Las fundadoras manejan stock, precios y pedidos en `/api/admin/`. Para crear su
usuario:

1. Consola de AWS → **Lambda** → **Functions** → abre la que empieza con
   `forme-api-ManageFunction`.
2. Pestaña **Test** → **Create new event** → en el JSON pega (con su correo y una
   contraseña temporal larga):

   ```json
   {"command": ["create_staff_user", "--email", "fundadora@ejemplo.com", "--password", "Temporal-Larga-2026!"]}
   ```

3. **Test**. Debe responder `Created admin fundadora@ejemplo.com.`
4. **No guardes el evento**, y si lo guardaste, bórralo: contiene la contraseña.
5. Entra a `https://…cloudfront.net/api/admin/` y cámbiala de inmediato desde
   **Change password** (arriba a la derecha).

---

## 7. Activar "Continuar con Google"

Los clientes pueden entrar con su cuenta de Google en vez de crear una contraseña.
Es opcional: sin este paso, el botón simplemente no aparece.

### 7.1 Crear el cliente OAuth en Google Cloud

1. Entra a <https://console.cloud.google.com> → crea un proyecto (por ejemplo
   `forme`).
2. Menú → **Google Auth Platform** (antes "Pantalla de consentimiento de OAuth"):
   - **Branding:** nombre de la app `forme`, correo de soporte y correo de contacto.
   - **Audience:** tipo **External** → **Publish app**. Mientras esté en
     "Testing", solo los usuarios de prueba que agregues podrán entrar.
   - No necesitas agregar scopes: el login usa solo `openid`, `email` y `profile`,
     que no requieren verificación de Google.
3. **Clients** → **Create client** → tipo **Web application**:
   - **Authorized JavaScript origins:**
     - `https://dxxxxxxxxxxxxx.cloudfront.net` (la URL de tu tienda, sin `/` al final)
     - `http://localhost:5173` y `http://localhost` (para desarrollo)
   - **Authorized redirect URIs:** déjalo vacío (el botón usa una ventana emergente).
4. **Create** → copia el **Client ID** (termina en `.apps.googleusercontent.com`).
   El Client ID es público, no es un secreto.

### 7.2 Conectarlo

1. GitHub → **Settings → Secrets and variables → Actions → Variables** → crea
   `GOOGLE_CLIENT_ID` con ese valor.
2. **Actions → CI/CD → Run workflow** (sin la casilla del catálogo).
3. Para desarrollo local: pon el mismo valor en `client/.env.local` como
   `VITE_GOOGLE_CLIENT_ID=…` y en `server/.env` como `GOOGLE_CLIENT_ID=…`.

### 7.3 Cómo funciona por dentro

- Google firma un token con sus llaves, y la API verifica firma, audiencia, emisor
  y vigencia. La API no tiene salida a internet, así que una función programada
  copia cada hora las llaves públicas de Google a un bucket de S3 que solo la red
  privada de la API puede leer.
- Si alguien ya tenía cuenta con contraseña y entra con Google usando un correo
  `@gmail.com` (o de Google Workspace), las cuentas se unen y **la contraseña
  anterior se desactiva**. Google demostró que esa persona es dueña del correo,
  pero la tienda nunca verificó quién puso la contraseña. Así nadie puede
  "pre-registrar" el correo de otra persona para espiar su dirección o sus pedidos.
- Con otros correos (Hotmail, Yahoo…) Google no garantiza quién es el dueño actual,
  así que no se unen: la persona entra con su contraseña.
- Las cuentas del admin (staff) nunca se abren con Google; siempre usan contraseña.

---

## 8. El día a día

- **Flujo recomendado:** trabaja en una rama → abre un pull request (corren las
  pruebas) → haz merge a `main` → se despliega solo.
- Un push directo a `main` también despliega. Los cambios que solo tocan archivos
  `.md` o la carpeta `Artifacts/` no disparan deploy.
- **Ver qué pasó:** pestaña **Actions** en GitHub. Los errores de la API en
  producción están en **CloudWatch → Log groups → `/aws/lambda/forme-api-ApiFunction…`**.
- **Regresar a una versión anterior:** `git revert <commit>` y push. Ojo: las
  migraciones de base de datos no se deshacen solas. Evita migraciones que borren
  columnas o datos sin respaldo.
- **Stock, precios y pedidos** se cambian en el admin, sin deploy.

---

## 9. Mantener el costo bajo

- La base de datos se pausa tras 5 minutos sin tráfico. Si la quieres siempre
  despierta (sin la espera de 15 s), cambia `MinCapacity: 0.5` en
  `server/template.yaml`, pero sube a ~US$44/mes.
- Revisa **Billing → Bills** la primera semana para confirmar que todo está en
  centavos.
- Un dominio propio (`forme.mx`) es opcional: el certificado HTTPS es gratis, la
  zona de Route 53 cuesta US$0.50/mes y el dominio se paga al año. Requiere ajustar
  `client/template.yaml`.

---

## 10. Problemas comunes

| Síntoma | Causa y solución |
| --- | --- |
| El job **Deploy to AWS** aparece como _skipped_ | Falta la variable `AWS_ROLE_ARN` (paso 4), o el run no fue en `main`. |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | El repositorio no coincide con `GitHubSubject` (¿lo renombraste o transferiste?). Actualiza el parámetro: CloudFormation → `forme-github` → **Update** → **Use current template**. |
| `Your account must be verified before you can add new CloudFront resources` | Pasa con algunas cuentas nuevas. Abre un caso en **AWS Support** (el plan básico es gratis) pidiendo la verificación y vuelve a correr el workflow. |
| `Cannot find version 16.6 for aurora-postgresql` | AWS retiró esa versión menor. Cambia `DatabaseEngineVersion` en `server/template.yaml` por una vigente (16.3 o mayor). |
| `forme-api … is in ROLLBACK_COMPLETE state and can not be updated` | Falló la creación inicial. Borra el stack `forme-api` en CloudFormation y vuelve a correr el workflow. |
| La API responde `{"detail": "Forbidden."}` | CloudFront y la API tienen distinto secreto de origen. Vuelve a correr el workflow para sincronizarlos. |
| Error 403 de CSRF al iniciar sesión | La API no conoce la URL de la tienda. Vuelve a correr el workflow, que la sincroniza. |
| No aparece el botón de Google | Falta `GOOGLE_CLIENT_ID` en GitHub (y volver a desplegar), o un bloqueador de anuncios bloquea `accounts.google.com`. |
| Google dice `origin_mismatch` / "origin not allowed" | Agrega la URL exacta de la tienda en **Authorized JavaScript origins** (puede tardar unos minutos en aplicar). |
| "Ya tienes una cuenta con este correo. Entra con tu contraseña." | Es la protección del paso 7.3: esa cuenta usa un correo que no es de Gmail/Workspace. |

---

## 11. Borrar todo

En la consola de AWS, en este orden:

1. **S3** → el bucket de `forme-web` → **Empty**. Luego **CloudFormation** → borra
   el stack `forme-web`.
2. **S3** → el bucket `forme-api-googlekeysbucket…` → **Empty**. Luego borra el
   stack `forme-api`. Queda una foto final de la base de datos: bórrala en **RDS →
   Snapshots** si ya no la quieres, para no pagar su almacenamiento.
3. **Systems Manager → Parameter Store** → borra los parámetros `/forme-api/…`.
4. Vacía el bucket de `aws-sam-cli-managed-default` y borra ese stack.
5. Borra el stack `forme-github`.

---

## 12. Alternativa: desplegar desde tu computadora

El mismo script que usa GitHub funciona en local, con los mismos secretos (SSM):

- Requisitos: AWS CLI configurada con credenciales de administrador, SAM CLI,
  Docker, Python 3.12 y Node 22.
- `./scripts/deploy.sh` (agrega `SEED_CATALOG=1` solo en el primer deploy, y
  `GOOGLE_CLIENT_ID=…` si usas Google).
