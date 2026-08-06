# File Sharing

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## What is File Sharing?

File Sharing is a simple lightweight temporary file hosting and sharing platform, but can also be used as a permanent file host.

## Features

- One click uploading, no registration required.
- A minimal, modern web interface.
- Drag & Drop & Paste supported.
- Upload API with multiple response choices:
    - JSON
    - HTML
    - Text
    - CSV
- Supports [ShareX](https://getsharex.com/) and other screenshot tools.
- File extension & MIME black/whitelisting.
- Upload rate limiting.
- File (hash) blacklisting.

### Demo

See the real world site at [files.mdrzn.it](https://files.mdrzn.it).

## Requirements

- PHP 8.3 with Fileinfo, PDO and APCu.
- SQLite, MySQL or PostgreSQL.
- Node.js 20+ or Bun, plus `make`, `jq`, `curl` and `pngquant` for the asset build.

## Build

```sh
npm install
make build-prod BUN=node NODE=node NPM=npm
make install BUN=node NODE=node NPM=npm PHP=php8.3
```

Update `src/config.json` before building. Deploy the generated application outside the web root and expose only its `public/` directory.

## Support

Open an issue at [github.com/mdrzn/file-sharing/issues](https://github.com/mdrzn/file-sharing/issues) or email files@mdrzn.it.

## Contributing

We'd really like if you can take some time to make sure your coding style is
consistent with the project. File Sharing follows [PHP
PSR-12](https://www.php-fig.org/psr/psr-12/)
coding style guides. We use PHPCS tools to enforce these standards.

You can also help by sending us feature requests or writing documentation and
tests.

## Credits

File Sharing is based on [Pomf](http://github.com/pomf/pomf) which was written by Emma Lejack & Go Johansson (nekunekus (nokonoko)) and with help from the open source community.

## License

File Sharing is free software, and is released under the terms of the GPL-3.0 license. See
`LICENSE`.
