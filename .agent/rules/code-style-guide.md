---
trigger: always_on
---

Use node.js.

Use Typescript and annotate all types possible. Write code that is typesafe.

Never use Javascript when Typescript can be used instead.

Use typescript-eslint for linting. Make all code conform to the standard typescript-eslint rules.

Add tests for code using the default node:test module.

When running node scripts that have a .ts extension, just run them with the node command, do not use node-ts. The version of node installed used to run scripts.

Do not add comments to the code you generate.

Check your work by running the following command:

    npm run lint && npm run typecheck && npm test && npm run build public/data.csv > github-public/index.html

When you check your work, do not ask me whether it is ok to run that command. Just go ahead and run it.