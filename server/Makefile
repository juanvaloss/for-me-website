# Run by `sam build --use-container` inside the Lambda build image, so the
# compiled wheels (psycopg, argon2) match the Lambda runtime.
APPS := service accounts store api

build-ApiFunction build-ManageFunction:
	pip install --no-cache-dir --requirement requirements.txt --target "$(ARTIFACTS_DIR)"
	cp -r manage.py $(APPS) "$(ARTIFACTS_DIR)"
	rm -rf $(foreach app,$(APPS),"$(ARTIFACTS_DIR)/$(app)/tests")
	find "$(ARTIFACTS_DIR)" -name __pycache__ -type d -prune -exec rm -rf {} +
