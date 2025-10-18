# Elarin Backend API

> **AI-Powered Fitness Trainer API** built with **NestJS + Fastify**

Uma API REST robusta e performática para treinos personalizados com inteligência artificial, utilizando NestJS para arquitetura estruturada e Fastify para máxima performance.

---

## 🚀 Stack Tecnológica

- **[NestJS](https://nestjs.com/)** - Framework progressivo para Node.js
- **[Fastify](https://www.fastify.io/)** - Web framework de alta performance (~30% mais rápido que Express)
- **[TypeScript](https://www.typescriptlang.org/)** - Superset tipado do JavaScript
- **[Supabase](https://supabase.com/)** - Backend as a Service (Auth + Database)
- **[class-validator](https://github.com/typestack/class-validator)** - Validação de DTOs com decorators
- **[Swagger/OpenAPI](https://swagger.io/)** - Documentação automática da API

---

## 📁 Estrutura do Projeto

```
src/
├── modules/                    # Módulos de features
│   ├── auth/                  # Autenticação (register, login, logout)
│   │   ├── dto/              # Data Transfer Objects
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── exercises/            # Gestão de exercícios
│   └── training/             # Sessões de treino
│
├── common/                    # Código compartilhado
│   ├── guards/               # Guards de autenticação
│   ├── filters/              # Exception filters
│   ├── decorators/           # Decorators customizados
│   └── services/             # Serviços globais (Supabase)
│
├── config/                   # Configurações
│   └── env.config.ts
│
├── app.module.ts             # Módulo raiz
└── main.ts                   # Bootstrap da aplicação
```

---

## ⚙️ Instalação

### Pré-requisitos

- Node.js >= 18.x
- npm ou yarn
- Conta no Supabase

### 1. Clone o repositório

```bash
git clone <repository-url>
cd elarin-backend-api
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# CORS
CORS_ORIGIN=*

# Optional
LOG_LEVEL=info
```

---

## 🏃 Executar o Projeto

### Modo Desenvolvimento

```bash
npm run dev
```

O servidor estará disponível em: **http://localhost:3001**

### Build para Produção

```bash
npm run build
npm run start:prod
```

### Verificar Tipos

```bash
npm run typecheck
```

---

## 📚 Documentação da API

A documentação interativa da API está disponível via **Swagger UI**:

```
http://localhost:3001/docs
```

---

## 🔐 Autenticação

A API utiliza **JWT (JSON Web Tokens)** para autenticação.

### Fluxo de Autenticação

1. **Registrar** um novo usuário: `POST /auth/register`
2. **Login** para obter o token: `POST /auth/login`
3. Usar o token em todas as requisições protegidas no header:
   ```
   Authorization: Bearer <seu-token>
   ```

### Endpoints Públicos (Sem autenticação)

- `POST /auth/register` - Registrar novo usuário
- `POST /auth/login` - Fazer login

### Endpoints Protegidos (Requerem token)

- `POST /auth/logout` - Fazer logout
- `GET /exercises` - Listar exercícios
- `GET /exercises/:type` - Buscar exercício por tipo
- `POST /training/sessions` - Criar sessão de treino
- `POST /training/sessions/complete` - Completar sessão
- `GET /training/history` - Ver histórico de treinos
- `GET /training/sessions/:id` - Detalhes de uma sessão

---

## 🧪 Testando a API

### Opção 1: Swagger UI (Recomendado)

Acesse: `http://localhost:3001/docs`

1. Execute o endpoint de **Login**
2. Copie o `access_token` retornado
3. Clique em **Authorize** no topo da página
4. Cole o token e clique em **Authorize**
5. Teste todos os endpoints protegidos!

### Opção 2: Postman

Importe os arquivos fornecidos:

1. **Coleção**: `Elarin_NestJS_API.postman_collection.json`
2. **Environment**: `Elarin_NestJS.postman_environment.json`

Veja instruções detalhadas em: [POSTMAN_SETUP_NESTJS.md](./POSTMAN_SETUP_NESTJS.md)

### Opção 3: cURL

```bash
# Registrar usuário
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "senha123",
    "full_name": "Usuario Teste"
  }'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "senha123"
  }'

# Listar exercícios (substitua SEU_TOKEN)
curl -X GET http://localhost:3001/exercises \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 🏗️ Arquitetura

### NestJS + Fastify

Esta API combina o melhor dos dois mundos:

- **NestJS**: Framework opinionado com injeção de dependências, módulos, decorators
- **Fastify**: Performance superior (~76k req/s vs ~53k req/s do Express)

### Padrões Utilizados

- **Módulos**: Organização por features (Auth, Exercises, Training)
- **DTOs (Data Transfer Objects)**: Validação com `class-validator`
- **Guards**: Proteção de rotas com JWT
- **Filters**: Tratamento de exceções global
- **Decorators**: `@CurrentUser()`, `@Public()` para simplificar código
- **Dependency Injection**: Injeção automática de serviços

### Exemplo de Controller

```typescript
@Controller('exercises')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all exercises' })
  async getAll() {
    return this.exercisesService.getAll();
  }
}
```

---

## 📊 Features

### ✅ Implementado

- Autenticação JWT com Supabase
- CRUD de exercícios
- Sessões de treino
- Histórico de treinos
- Validação automática de DTOs
- Rate limiting (100 req/min)
- Documentação Swagger automática
- Exception handling global
- Guards de autenticação
- CORS configurável
- Helmet para segurança

### 🔜 Planejado

- WebSockets para treinos em tempo real
- Upload de vídeos de exercícios
- Analytics de performance
- Sistema de notificações
- Cache com Redis
- Testes automatizados (Jest)

---

## 🔒 Segurança

- **Helmet**: Headers de segurança HTTP
- **CORS**: Configurável via environment
- **Rate Limiting**: 100 requisições por minuto
- **JWT**: Tokens seguros com Supabase Auth
- **Validação**: Todos os inputs validados com class-validator
- **TypeScript**: Tipagem estática para prevenir erros

---

## 📦 Scripts Disponíveis

```bash
# Desenvolvimento com hot-reload
npm run dev

# Build para produção
npm run build

# Executar produção
npm run start:prod

# Verificar tipos TypeScript
npm run typecheck
```

---

## 🐛 Troubleshooting

### Porta já em uso

Se a porta 3001 estiver ocupada, altere no `.env`:

```env
PORT=3002
```

### Erro de conexão com Supabase

Verifique se as credenciais no `.env` estão corretas:

- `SUPABASE_URL`: Deve começar com `https://`
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (não a anon key)

### Token expirado

Execute o endpoint de login novamente para obter um novo token.

---

## 📖 Documentação Adicional

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Guia de migração Fastify → NestJS
- [ESTRUTURA_NOVA.md](./ESTRUTURA_NOVA.md) - Detalhes da estrutura do projeto
- [POSTMAN_SETUP_NESTJS.md](./POSTMAN_SETUP_NESTJS.md) - Setup do Postman

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👥 Equipe

**Elarin Team** - AI-Powered Fitness Solutions

---

## 🙏 Agradecimentos

- [NestJS](https://nestjs.com/) - Framework incrível
- [Fastify](https://www.fastify.io/) - Performance excepcional
- [Supabase](https://supabase.com/) - Backend simplificado
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

## 📞 Suporte

Para dúvidas ou problemas, abra uma [issue](https://github.com/elarin-team/elarin-backend/issues).

---

**🚀 Desenvolvido com NestJS + Fastify para máxima performance e escalabilidade!**
