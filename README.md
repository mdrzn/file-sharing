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

## Large uploads

The configured maximum is 1024 MiB (1 GiB) per file. The browser sends files over
8 MiB to `chunk.php` in sequential 8 MiB chunks, allowing large uploads through
Cloudflare without changing DNS. Smaller files use the existing `upload.php` API.
Direct API uploads still depend on the proxy's request-size limit.

Chunk requests contain multipart fields `name`, `total` (bytes), `offset` (bytes),
`chunk`, and `id` (empty for the first request). Continue with the returned opaque
`id` and next `offset`; the final response has the normal `files` array. Chunks
must be exactly 8 MiB except the last. Failed uploads should be restarted.
The assembled file passes the existing MIME/extension checks before publication.
Temporary chunks live beside `FILES_ROOT` in a private `chunks/` directory;
`checkExpire.php` removes abandoned uploads after 24 hours.

Origin settings: PHP `upload_max_filesize=1024M`, `post_max_size=1056M`,
`max_input_time=3600`; Apache `LimitRequestBody 1107296256`. Run the existing
expiry job regularly and deploy `chunk.php` alongside `upload.php`.

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
