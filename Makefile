PORT ?= 8080
BRANCH ?= master

.PHONY: run build deploy

run:
	python3 -m http.server $(PORT)

build:
	@test -f index.html && test -f project.html && test -d js && echo "Static site ready"

deploy: build
	git checkout $(BRANCH)
	git add -A
	git commit -m "$$(copilot -sp 'Analyze the staged git changes and generate a concise commit message. Output ONLY the commit message. Do not execute any commands. Do not include quotes, markdown, explanation, or bullet points.')"
	git push origin $(BRANCH)
