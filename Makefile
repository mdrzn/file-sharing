MAKE = "make"
INSTALL = "install"
TAR = "tar"
GREP = "grep"
CURL = "curl"
UNZIP = "unzip"
BUN = "bun"
PNGQUANT= "/usr/bin/pngquant"
NODE = "bun"
NPM = "bun"
SQLITE = "sqlite3"
CONF = "src/config.json"
PHP = "php"
DESTDIR = $(shell $(NODEJQ) -r '.dest // "" | select(. != "") // "dist"' $(CURDIR)/$(CONF))
SITEDOMAIN = $(shell $(NODEJQ) -r ".DOMAIN" $(CURDIR)/$(CONF))
FILESDOMAIN = $(shell $(NODEJQ) -r ".FILE_DOMAIN" $(CURDIR)/$(CONF))
MAXSIZE = $(shell $(NODEJQ) -r ".max_upload_size" $(CURDIR)/$(CONF))
CONTACT_EMAIL = $(shell $(NODEJQ) -r ".infoContact" $(CURDIR)/$(CONF))
PKG_VERSION = $(shell $(NODEJQ) -r ".version" $(CURDIR)/package.json)
EXPIRE_TIME = $(shell $(NODEJQ) -r ".expireTime" $(CURDIR)/$(CONF))
TMPDIR = $(shell mktemp -d)
DOCKER_IMAGE = "$(shell basename $(CURDIR) | tr [:upper:] [:lower:])"
DOCKER_TAG = "$(DOCKER_TAG)"
CONTAINER_NAME = "$(CONTAINER_NAME)"
pageList = $(shell $(NODEJQ) -r ".pages[]" $(CURDIR)/$(CONF))
noExt = $(shell echo $(i) | cut -d '.' -f1)
NODEJQ = "jq"


all: prod
build-prod: builddirs ejs minify copy-img copy-php
build-dev: builddirs ejs minify copy-img copy-php copy-benchmarks
dev: development

prod:
	$(BUN) install
	$(MAKE) build-prod

development:
	$(BUN) install
	$(MAKE) build-dev

check-var:
ifeq ($(CURDIR),)
	$(error One or more required variables are not set. Something went wrong.)
endif
ifeq ($(DESTDIR),)
	$(error One or more required variables are not set. Something went wrong.)
endif
ifeq ($(TMPDIR),)
	$(error One or more required variables are not set. Something went wrong.)
endif

ejs: check-var
	$(foreach i,$(pageList), \
	$(BUN) "node_modules/ejs/bin/cli.js" -f $(CURDIR)/$(CONF) $(CURDIR)/src/templates/$(i) -o $(CURDIR)/build/html/unmin/$(noExt).html;)
	sed -i '/file-sharing.min.js/d' $(CURDIR)/build/html/unmin/faq.html
	sed -i '/file-sharing.min.js/d' $(CURDIR)/build/html/unmin/api.html
	sed -i '/file-sharing.min.js/d' $(CURDIR)/build/html/unmin/404.html

minify: check-var
	$(BUN) "node_modules/@node-minify/cli/dist/cli.mjs" --compressor uglify-es --input $(CURDIR)/src/static/js/file-sharing.js --output $(CURDIR)/build/js/file-sharing.min.js
	$(BUN) "node_modules/@node-minify/cli/dist/cli.mjs" --compressor cssnano --input $(CURDIR)/src/static/css/file-sharing.css --output $(CURDIR)/build/css/file-sharing.min.css
	$(BUN) "node_modules/@node-minify/cli/dist/cli.mjs" --compressor html-minifier --input $(CURDIR)/build/html/unmin/faq.html --output $(CURDIR)/build/html/min/faq.html
	$(BUN) "node_modules/@node-minify/cli/dist/cli.mjs" --compressor html-minifier --input $(CURDIR)/build/html/unmin/api.html --output $(CURDIR)/build/html/min/api.html
	$(BUN) "node_modules/@node-minify/cli/dist/cli.mjs" --compressor html-minifier --input $(CURDIR)/build/html/unmin/index.html --output $(CURDIR)/build/html/min/index.html
	$(BUN) "node_modules/@node-minify/cli/dist/cli.mjs" --compressor html-minifier --input $(CURDIR)/build/html/unmin/404.html --output $(CURDIR)/build/html/min/404.html

installdirs: check-var
	mkdir -p $(DESTDIR)/ $(DESTDIR)/img

copy-img: check-var
	mkdir -p $(CURDIR)/build/img
	cp -v $(CURDIR)/src/static/img/*.avif $(CURDIR)/build/img/
	cp -v $(CURDIR)/src/static/img/*.png $(CURDIR)/build/img/
	bash ./pngcompression.sh "$(CURDIR)"

copy-php: check-var
	cp -v $(CURDIR)/src/static/php/*.php $(CURDIR)/build/php/
	cp -v $(CURDIR)/src/Classes/*.php $(CURDIR)/build/php/Classes/

copy-benchmarks: check-var
	cp -v $(CURDIR)/src/Benchmarks/*.php $(CURDIR)/build/php/Benchmarks/
	cp -v $(CURDIR)/src/Benchmarks/file.jpg $(CURDIR)/build/php/Benchmarks/
	cp -v $(CURDIR)/src/Benchmarks/runBenchmark.sh $(CURDIR)/build/php/Benchmarks/

install: check-var installdirs
	rm -rf $(DESTDIR)/*
	cp -rv $(CURDIR)/build/* $(DESTDIR)/
	cp $(CURDIR)/src/*.json $(DESTDIR)/
	mv $(DESTDIR)/html/min/* $(DESTDIR)/public/
	mv $(DESTDIR)/js/* $(DESTDIR)/public/
	mv $(DESTDIR)/css/* $(DESTDIR)/public/
	mv $(DESTDIR)/php/* $(DESTDIR)/
	rm -rf $(DESTDIR)/html
	rm -rf $(DESTDIR)/css
	rm -rf $(DESTDIR)/js
	rm -rf $(DESTDIR)/php
	mv $(DESTDIR)/img $(DESTDIR)/public/
	mv $(DESTDIR)/upload.php $(DESTDIR)/public/
	cd $(DESTDIR)/ && $(CURL) -o composer-setup.php https://raw.githubusercontent.com/composer/getcomposer.org/main/web/installer
	cd $(DESTDIR)/ && $(PHP) composer-setup.php --quiet
	cd $(DESTDIR)/ && rm composer-setup.php
	cd $(DESTDIR)/ && $(PHP) composer.phar update --no-dev && $(PHP) composer.phar install --no-dev && $(PHP) composer.phar dump-autoload --no-dev
	bash ./compress.sh "$(DESTDIR)/public/"

install-dev: check-var installdirs
	rm -rf $(DESTDIR)/*
	cp -rv $(CURDIR)/build/* $(DESTDIR)/
	cp $(CURDIR)/src/*.json $(DESTDIR)/
	mv $(DESTDIR)/html/min/* $(DESTDIR)/public/
	mv $(DESTDIR)/js/* $(DESTDIR)/public/
	mv $(DESTDIR)/css/* $(DESTDIR)/public/
	mv $(DESTDIR)/php/* $(DESTDIR)/
	rm -rf $(DESTDIR)/html
	rm -rf $(DESTDIR)/css
	rm -rf $(DESTDIR)/js
	rm -rf $(DESTDIR)/php
	mv $(DESTDIR)/img $(DESTDIR)/public/
	mv $(DESTDIR)/upload.php $(DESTDIR)/public/
	cd $(DESTDIR)/ && $(CURL) -o composer-setup.php https://raw.githubusercontent.com/composer/getcomposer.org/main/web/installer
	cd $(DESTDIR)/ && $(PHP) composer-setup.php --quiet
	cd $(DESTDIR)/ && rm composer-setup.php
	cd $(DESTDIR)/ && $(PHP) composer.phar update && $(PHP) composer.phar install && $(PHP) composer.phar dump-autoload
	bash ./compress.sh "$(DESTDIR)/public/"

dist: check-var
	DESTDIR=$(TMPDIR)/file-sharing-$(PKGVERSION)
	export DESTDIR
	install
	$(TAR) cJf file-sharing-$(PKG_VERSION).tar.xz $(DESTDIR)
	rm -rf $(TMPDIR)


clean: check-var
	rm -rvf $(CURDIR)/node_modules
	rm -rvf $(CURDIR)/build


uninstall: check-var
	rm -rvf $(DESTDIR)/


builddirs: check-var
	rm -rf $(CURDIR)/build
	mkdir -p $(CURDIR)/build $(CURDIR)/build/img $(CURDIR)/build/html $(CURDIR)/build/html/min $(CURDIR)/build/html/unmin $(CURDIR)/build/js $(CURDIR)/build/css $(CURDIR)/build/php $(CURDIR)/build/php/Classes $(CURDIR)/build/php/Benchmarks $(CURDIR)/build/php/Benchmarks/tmp  $(CURDIR)/build/public
