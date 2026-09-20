import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'TaskBoard API',
    version: '1.0.0',
    description:
      'A professional, Jira-inspired Project and Issue Management REST API with JWT authentication, role authorization, atomic issue keys, and activity auditing.',
    contact: {
      name: 'TaskBoard API Engineering Team',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API Version 1',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from /auth/login or /auth/register',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Resource not found' },
          error: { type: 'string', example: 'NOT_FOUND' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Invalid email address format' },
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Alice Johnson' },
          email: { type: 'string', format: 'email', example: 'alice@example.com' },
          role: { type: 'string', enum: ['ADMIN', 'USER'], example: 'USER' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login successful' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            },
          },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Core Platform' },
          key: { type: 'string', example: 'PLAT' },
          description: { type: 'string', example: 'Backend infrastructure and services' },
          ownerId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProjectMember: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['OWNER', 'MEMBER'], example: 'MEMBER' },
          joinedAt: { type: 'string', format: 'date-time' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Issue: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          issueKey: { type: 'string', example: 'PLAT-1' },
          title: { type: 'string', example: 'Implement OAuth2 flow' },
          description: { type: 'string', example: 'Add support for Google and GitHub SSO' },
          type: { type: 'string', enum: ['TASK', 'BUG', 'FEATURE'], example: 'FEATURE' },
          status: {
            type: 'string',
            enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'],
            example: 'IN_PROGRESS',
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            example: 'HIGH',
          },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          projectId: { type: 'string', format: 'uuid' },
          reporterId: { type: 'string', format: 'uuid' },
          assigneeId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          reporter: { $ref: '#/components/schemas/User' },
          assignee: { $ref: '#/components/schemas/User', nullable: true },
          labels: {
            type: 'array',
            items: { $ref: '#/components/schemas/Label' },
          },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          content: { type: 'string', example: 'Ready for peer review' },
          issueId: { type: 'string', format: 'uuid' },
          authorId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          author: { $ref: '#/components/schemas/User' },
        },
      },
      Label: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'backend' },
          projectId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Activity: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          issueId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          action: { type: 'string', example: 'STATUS_CHANGED' },
          oldValue: { type: 'string', example: 'TODO' },
          newValue: { type: 'string', example: 'IN_PROGRESS' },
          createdAt: { type: 'string', format: 'date-time' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'John Doe' },
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  password: { type: 'string', minLength: 6, example: 'secret123' },
                  role: { type: 'string', enum: ['ADMIN', 'USER'], default: 'USER' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User successfully registered',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          409: {
            description: 'User already exists',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in and receive JWT token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@taskboard.io' },
                  password: { type: 'string', example: 'Admin123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current authenticated user profile',
        responses: {
          200: {
            description: 'Current user profile',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List all users (for assignment autocomplete)',
        responses: {
          200: {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/projects': {
      post: {
        tags: ['Projects'],
        summary: 'Create a new project',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'key'],
                properties: {
                  name: { type: 'string', example: 'Mobile App' },
                  key: { type: 'string', example: 'MOB', description: 'Uppercase key (e.g. MOB)' },
                  description: { type: 'string', example: 'React Native companion app' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Project created' },
          409: { description: 'Project key already exists' },
        },
      },
      get: {
        tags: ['Projects'],
        summary: 'List projects user belongs to',
        responses: {
          200: { description: 'List of user projects' },
        },
      },
    },
    '/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Get project details',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Project details' },
          404: { description: 'Project not found' },
        },
      },
      patch: {
        tags: ['Projects'],
        summary: 'Update project (Owner or Admin only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Updated Project Name' },
                  description: { type: 'string', example: 'Updated project description' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Project updated' },
          403: { description: 'Forbidden' },
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete project (Owner or Admin only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Project deleted' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/projects/{id}/members': {
      get: {
        tags: ['Project Members'],
        summary: 'View project members',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'List of project members' },
        },
      },
      post: {
        tags: ['Project Members'],
        summary: 'Add a member to project (Owner only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email', example: 'bob@example.com' },
                  userId: { type: 'string', format: 'uuid' },
                  role: { type: 'string', enum: ['OWNER', 'MEMBER'], default: 'MEMBER' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Member added' },
          409: { description: 'Member already exists' },
        },
      },
    },
    '/projects/{id}/members/{userId}': {
      delete: {
        tags: ['Project Members'],
        summary: 'Remove a member from project (Owner only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Member removed' },
        },
      },
    },
    '/projects/{projectId}/issues': {
      post: {
        tags: ['Issues'],
        summary: 'Create issue in project (auto-generates issue key e.g. TASK-1)',
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', example: 'Fix authentication token expiration' },
                  description: {
                    type: 'string',
                    example: 'Refresh tokens should be handled gracefully.',
                  },
                  type: { type: 'string', enum: ['TASK', 'BUG', 'FEATURE'], default: 'TASK' },
                  status: {
                    type: 'string',
                    enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'],
                    default: 'BACKLOG',
                  },
                  priority: {
                    type: 'string',
                    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
                    default: 'MEDIUM',
                  },
                  assigneeId: { type: 'string', format: 'uuid', nullable: true },
                  dueDate: { type: 'string', format: 'date-time', nullable: true },
                  labelIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Issue created' },
        },
      },
      get: {
        tags: ['Issues'],
        summary: 'List, search, filter, and paginate issues in project',
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'] },
          },
          {
            name: 'priority',
            in: 'query',
            schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          },
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['TASK', 'BUG', 'FEATURE'] },
          },
          { name: 'assigneeId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'reporterId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          {
            name: 'q',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search term across title, description, or key',
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['createdAt', 'updatedAt', 'priority', 'dueDate', 'title'],
            },
          },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: { description: 'Paginated issues list' },
        },
      },
    },
    '/issues/{id}': {
      get: {
        tags: ['Issues'],
        summary: 'Get issue details by UUID or issueKey (e.g., TASK-1)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Issue details with comments and activities' },
          404: { description: 'Issue not found' },
        },
      },
      patch: {
        tags: ['Issues'],
        summary: 'Update issue (status, priority, assignee, type, details)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  type: { type: 'string', enum: ['TASK', 'BUG', 'FEATURE'] },
                  status: { type: 'string', enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'] },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                  assigneeId: { type: 'string', format: 'uuid', nullable: true },
                  dueDate: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Issue updated and activity recorded' },
        },
      },
      delete: {
        tags: ['Issues'],
        summary: 'Delete issue',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Issue deleted' },
        },
      },
    },
    '/issues/{id}/activities': {
      get: {
        tags: ['Activities'],
        summary: 'Get activity history for an issue',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'List of activity history logs' },
        },
      },
    },
    '/issues/{issueId}/comments': {
      post: {
        tags: ['Comments'],
        summary: 'Add a comment to an issue',
        parameters: [
          {
            name: 'issueId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', example: 'PR is up at branch feature/auth' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Comment created' },
        },
      },
      get: {
        tags: ['Comments'],
        summary: 'List all comments on an issue',
        parameters: [
          {
            name: 'issueId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'List of comments' },
        },
      },
    },
    '/comments/{id}': {
      patch: {
        tags: ['Comments'],
        summary: 'Edit comment (author only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', example: 'Updated comment text' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Comment updated' },
          403: { description: 'Forbidden' },
        },
      },
      delete: {
        tags: ['Comments'],
        summary: 'Delete comment (author or admin)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Comment deleted' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/projects/{projectId}/labels': {
      post: {
        tags: ['Labels'],
        summary: 'Create a label in a project',
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'frontend' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Label created' },
          409: { description: 'Label already exists in this project' },
        },
      },
      get: {
        tags: ['Labels'],
        summary: 'List all labels in a project',
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'List of labels' },
        },
      },
    },
    '/issues/{issueId}/labels': {
      post: {
        tags: ['Labels'],
        summary: 'Attach a label to an issue',
        parameters: [
          {
            name: 'issueId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['labelId'],
                properties: {
                  labelId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Label attached' },
        },
      },
      get: {
        tags: ['Labels'],
        summary: 'List labels attached to an issue',
        parameters: [
          {
            name: 'issueId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'List of attached labels' },
        },
      },
    },
    '/issues/{issueId}/labels/{labelId}': {
      delete: {
        tags: ['Labels'],
        summary: 'Detach label from an issue',
        parameters: [
          {
            name: 'issueId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'labelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Label detached' },
        },
      },
    },
  },
};

export const setupSwagger = (app: Application): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
};
