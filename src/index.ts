import { createYoga, createSchema } from "graphql-yoga";

type Env = {
  TASK_MANAGER: KVNamespace;
};

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      tasksByOwnerId(ownerId: ID!): [Task!]!
    }

    type Mutation {
      addTask(ownerId: ID!, title: String!): Task!
      updateTask(id: ID!, ownerId: ID!, title: String!): Task!
    }

    type Task {
      id: ID!
      ownerId: ID!
      title: String!
    }
  `,
  resolvers: {
    Query: {
      tasksByOwnerId: async (_, args, env: Env) => {
        const list = await env.TASK_MANAGER.list({
          prefix: `task:${args.ownerId}:`,
        });
        const tasks = await Promise.all(
          list.keys.map(async (key) => {
            const val = await env.TASK_MANAGER.get(key.name, "json");
            return val;
          })
        );

        return tasks;
      },
    },
    Mutation: {
      addTask: async (_, args, env: Env) => {
        const id = self.crypto.randomUUID();
        const task = {
          id,
          ownerId: args.ownerId,
          title: args.title,
        };

        await env.TASK_MANAGER.put(
          `task:${args.ownerId}:${id}`,
          JSON.stringify(task)
        );

        return task;
      },
      updateTask: async (_, args, env: Env) => {
        const current = await env.TASK_MANAGER.get(
          `task:${args.ownerId}:${args.id}`,
          "json"
        );
        if (!current) {
          throw new Error("Invali id: " + args.id);
        }

        const task = {
          id: args.id,
          ownerId: args.ownerId,
          title: args.title,
        };

        await env.TASK_MANAGER.put(
          `task:${args.ownerId}:${args.id}`,
          JSON.stringify(task)
        );

        return task;
      },
    },
  },
});

export default {
  fetch(request: Request, env: Env, ...rest: any[]) {
    const yoga = createYoga({
      graphqlEndpoint: "/graphql",
      landingPage: false,
      schema,
    });

    return yoga.fetch(request, env, ...rest);
  },
};
