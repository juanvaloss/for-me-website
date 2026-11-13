# Guía de despliegue: AWS + CI/CD con GitHub Actions

Al terminar esta guía tendrás el catálogo en internet y un flujo automático: **cada
vez que hagas push a `main`, GitHub corre las pruebas y, si pasan, despliega a AWS.**
Los pull requests solo corren las pruebas.

No necesitas instalar nada en tu computadora para desplegar: todo se hace desde
el navegador (consola de AWS y GitHub).

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
7. [El día a día](#7-el-día-a-día)
8. [Mantener el costo bajo](#8-mantener-el-costo-bajo)
9. [Problemas comunes](#9-problemas-comunes)
10. [Borrar todo](#10-borrar-todo)
11. [Alternativa: desplegar desde tu computadora](#11-alternativa-desplegar-desde-tu-computadora)

---

## 1. Cuánto cuesta

La arquitectura está pensada para costar lo menos posible:

| Pieza | Costo mensual aproximado |
| --- | --- |
| GitHub Actions (pruebas y deploys) | **$0** en repositorios públicos |
| CloudFront, Lambda, EventBridge | **$0** dentro de los límites gratuitos permanentes |
| Credenciales de GitHub (OIDC), secretos (SSM Parameter Store) | **$0** |
| S3 (el sitio y los paquetes del deploy) | centavos |
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
5. Todo el proyecto vive en la región **US East (N. Virginia) `us-east-1`**. No
   hace falta activarla, ya viene activada. Se elige en el selector de arriba a la
   derecha, pero **solo dentro de un servicio regional**. En páginas globales como
   Billing, IAM o Budgets el selector dice **Global** y todas las regiones salen con
   un candado. Abre por ejemplo **CloudFormation** (paso 3) y ahí elige
   **N. Virginia**, o entra directo a
   <https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1>.

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

Las fundadoras manejan el stock, los precios y las fotos en `/api/admin/`. Los
pedidos siguen por Instagram. Para crear su usuario:

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

## 7. El día a día

- **Flujo recomendado:** trabaja en una rama → abre un pull request (corren las
  pruebas) → haz merge a `main` → se despliega solo.
- Un push directo a `main` también despliega. Los cambios que solo tocan archivos
  `.md` o la carpeta `Artifacts/` no disparan deploy.
- **Ver qué pasó:** pestaña **Actions** en GitHub. Los errores de la API en
  producción están en **CloudWatch → Log groups → `/aws/lambda/forme-api-ApiFunction…`**.
- **Regresar a una versión anterior:** `git revert <commit>` y push. Ojo: las
  migraciones de base de datos no se deshacen solas. Evita migraciones que borren
  columnas o datos sin respaldo.
- **Stock y precios** se cambian en el admin, sin deploy: en **Product
  variants** está cada producto, color y talla en una sola tabla editable.
  Mantenerlo al día evita que la gente pregunte por piezas agotadas.

---

## 8. Mantener el costo bajo

- La base de datos se pausa tras 5 minutos sin tráfico. Si la quieres siempre
  despierta (sin la espera de 15 s), cambia `MinCapacity: 0.5` en
  `server/template.yaml`, pero sube a ~US$44/mes.
- Revisa **Billing → Bills** la primera semana para confirmar que todo está en
  centavos.
- Un dominio propio (`forme.mx`) es opcional: el certificado HTTPS es gratis, la
  zona de Route 53 cuesta US$0.50/mes y el dominio se paga al año. Requiere ajustar
  `client/template.yaml`.

---

## 9. Problemas comunes

| Síntoma | Causa y solución |
| --- | --- |
| El job **Deploy to AWS** aparece como _skipped_ | Falta la variable `AWS_ROLE_ARN` (paso 4), o el run no fue en `main`. |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | El repositorio no coincide con `GitHubSubject` (¿lo renombraste o transferiste?). Actualiza el parámetro: CloudFormation → `forme-github` → **Update** → **Use current template**. |
| `Your account must be verified before you can add new CloudFront resources` | Pasa con algunas cuentas nuevas. Abre un caso en **AWS Support** (el plan básico es gratis) pidiendo la verificación y vuelve a correr el workflow. |
| `DatabaseCluster` falla con `Cannot find version … for aurora-postgresql` | AWS retira cada versión menor más o menos al año. Cambia `DatabaseEngineVersion` en `server/template.yaml` por una vigente (16.3 o mayor; las ves en **RDS → Create database → Aurora PostgreSQL → Engine version**), haz push y vuelve a correr. |
| `DatabaseCluster` falla con un mensaje que menciona _free plan_, _free tier_ o _express configuration_ | La cuenta está en el Free plan, que solo permite Aurora en "express configuration". Cámbiala a **Paid plan** (Billing → **Upgrade plan**; conservas los créditos) y vuelve a correr. |
| Falló el primer deploy y el stack quedó en `ROLLBACK_COMPLETE` | El script borra solo ese stack vacío en la siguiente corrida; arregla la causa y vuelve a correr el workflow. |
| La API responde `{"detail": "Forbidden."}` | CloudFront y la API tienen distinto secreto de origen. Vuelve a correr el workflow para sincronizarlos. |
| Error 403 de CSRF al entrar al admin | La API no conoce la URL del sitio. Vuelve a correr el workflow, que la sincroniza. |
| Al dar "Pídelo por DM" no se pega nada | El navegador bloqueó el portapapeles (pasa en algunos navegadores dentro de apps). El chat de Instagram abre igual y la persona puede escribir su mensaje. |

---

## 10. Borrar todo

En la consola de AWS, en este orden:

1. **S3** → el bucket de `forme-web` → **Empty**. Luego **CloudFormation** → borra
   el stack `forme-web`.
2. Borra el stack `forme-api`. Queda una foto final de la base de datos: bórrala
   en **RDS → Snapshots** si ya no la quieres, para no pagar su almacenamiento.
3. **Systems Manager → Parameter Store** → borra los parámetros `/forme-api/…`.
4. Vacía el bucket de `aws-sam-cli-managed-default` y borra ese stack.
5. Borra el stack `forme-github`.

---

## 11. Alternativa: desplegar desde tu computadora

El mismo script que usa GitHub funciona en local, con los mismos secretos (SSM):

- Requisitos: AWS CLI configurada con credenciales de administrador, SAM CLI,
  Docker, Python 3.12 y Node 22.
- `./scripts/deploy.sh` (agrega `SEED_CATALOG=1` solo en el primer deploy).
