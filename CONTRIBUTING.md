# Contributing

Thanks for helping improve Alexa Assistant. Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting bugs and requesting features

- Check [Troubleshooting](docs/common_problems.md) and the [existing issues](https://github.com/rokmohar/alexa-assistant/issues) first.
- Use the issue templates for [bug reports and feature requests](https://github.com/rokmohar/alexa-assistant/issues/new/choose).
- Report security vulnerabilities privately, as described in the [Security policy](SECURITY.md), not in a public issue.

## Development setup

You need Node.js 24 (see [`.nvmrc`](.nvmrc)) and npm 11+.

```bash
git clone https://github.com/rokmohar/alexa-assistant.git
cd alexa-assistant
nvm use      # optional, if you use nvm
npm install  # also installs the Husky pre-commit hook
```

To test against a real skill, follow the [installation guide](docs/serverless_install.md) and deploy your own stack with `npm run deploy`.

## Making changes

1. For anything bigger than a small fix, open an issue first so we can agree on the approach.
2. Fork the repository and create a branch from `master`.
3. Keep each pull request focused on one change. Follow the existing code style; ESLint and Prettier enforce it.
4. If the change affects setup or behavior, update the docs and the interaction model (`serverless.yml` and the JSON in the installation guide).
5. Make sure all checks pass:

   ```bash
   npm run typecheck
   npm run lint
   npm run format
   npm run build
   ```

   The pre-commit hook runs ESLint and Prettier on staged files automatically.

6. Open a pull request and fill in the template.

## License

By contributing, you agree that your contributions are licensed under the [GPL-3.0 License](LICENSE).
