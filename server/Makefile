# Run by `sam build`: inside the Lambda build image locally (--use-container) and
# directly on GitHub's x86 runner. pip fetches the arm64 wheels that Lambda's
# python3.12 runtime needs (Amazon Linux 2023, glibc 2.34) whatever the machine.
APPS := service accounts store api
LAMBDA_PLATFORM := --platform manylinux_2_34_aarch64 --platform manylinux_2_28_aarch64 \
    --platform manylinux2014_aarch64 --implementation cp --python-version 3.12 \
    --only-binary=:all:

build-ApiFunction build-ManageFunction:
	pip install --no-cache-dir $(LAMBDA_PLATFORM) --requirement requirements.txt --target "$(ARTIFACTS_DIR)"
	cp -r manage.py $(APPS) "$(ARTIFACTS_DIR)"
	rm -rf $(foreach app,$(APPS),"$(ARTIFACTS_DIR)/$(app)/tests")
	find "$(ARTIFACTS_DIR)" -name __pycache__ -type d -prune -exec rm -rf {} +
