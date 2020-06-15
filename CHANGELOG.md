# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Fixed error event emittion.
- Fixed events emittion on invalid request id.

### Changed
- Readme
- Changed error response to HttpErrorResponse
- On rejection Http Error response will be returned

## [1.1.3] - 2020-05-03

### Changed
- param name changed from id to requestId

## [1.1.2] - 2020-05-03

### Fixed
- fixed multiple events response
- Fixed on upload first event was error

## [1.1.0] - 2020-04-29

### Added

- Facility to send headers with request

### Fixed
- Fixed on removing file it will send file and the id of deleted file
- Fixed on cancel uploading file it will send file and the id of cencelled file.

## [1.0.0] - 2020-04-29

### Added

- Added File drag drop dirctive 
- Added File select directive
- Uploading files in a single request

[Unreleased]: https://github.com/jayprajapati857/ngx-uploader-directive/compare/1.1.3...HEAD
[1.1.3]: https://github.com/jayprajapati857/ngx-uploader-directive/compare/1.1.2...1.1.3
[1.1.2]: https://github.com/jayprajapati857/ngx-uploader-directive/compare/1.1.0...1.1.2
[1.1.0]: https://github.com/jayprajapati857/ngx-uploader-directive/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/jayprajapati857/ngx-uploader-directive/releases/tag/1.0.0