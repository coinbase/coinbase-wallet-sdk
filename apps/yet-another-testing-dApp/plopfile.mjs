export default function plopped(plop) {
  plop.setHelper("curly", (_, open) => {
    return open ? "{" : "}";
  });
  plop.setGenerator("RPC Method", {
    description: "add a new RPC Method",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the rpc method?",
      },
    ],
    actions: (data) => {
      if (!data) return [];

      const actions = [
        {
          type: "add",
          path: "src/app/rpc/{{pascalCase name}}.tsx",
          templateFile: "plop/template-rpc.tsx.hbs",
        },
        {
          type: "append",
          path: "src/app/rpc/page.tsx",
          pattern: "/* PLOP: adds RPC import */",
          template:
            'import {{curly true}} {{pascalCase name}} {{curly}} from "./{{pascalCase name}}";',
        },
        {
          type: "append",
          path: "src/app/rpc/page.tsx",
          pattern: /({\/\* PLOP: adds RPC component \*\/})/gi,
          template: "      <{{pascalCase name}} />",
        },
      ];
      return actions;
    },
  });
}
