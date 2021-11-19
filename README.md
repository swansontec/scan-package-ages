# scan-package-ages

Goes through node_modules and figures out how old each installed package is,
oldest-to-newest.

If you are worried about people publishing malicious packages,
this could be a useful tool, especially when combined with
`npm install --ignore-scripts`, since it gives you an idea of which
packages need the most auditing.
