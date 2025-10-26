# Configuração de Exercícios Padrão

Este diretório contém a configuração dos exercícios que serão automaticamente criados para cada novo usuário ao se registrar.

## 📄 Arquivo: `default-exercises.json`

### Estrutura

```json
{
  "exercises": [
    {
      "type": "squat",
      "name": "Agachamento",
      "is_active": true
    }
  ]
}
```

### Campos

| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `type` | string | Identificador único do exercício (ex: squat, pushup) | ✅ Sim |
| `name` | string | Nome do exercício que será exibido ao usuário | ✅ Sim |
| `is_active` | boolean | Se o exercício está ativo (true) ou inativo (false) | ✅ Sim |

---

## ✏️ Como Adicionar Novos Exercícios

### 1. Edite o arquivo `default-exercises.json`

```json
{
  "exercises": [
    {
      "type": "squat",
      "name": "Agachamento",
      "is_active": true
    },
    {
      "type": "pushup",
      "name": "Flexão",
      "is_active": true
    },
    {
      "type": "pullup",
      "name": "Barra Fixa",
      "is_active": true
    },
    {
      "type": "plank",
      "name": "Prancha",
      "is_active": true
    },
    {
      "type": "burpee",
      "name": "Burpee",
      "is_active": true
    },
    {
      "type": "lunge",
      "name": "Afundo",
      "is_active": true
    }
  ]
}
```

### 2. Reinicie o backend

```bash
npm run dev
```

O backend irá carregar automaticamente os novos exercícios na próxima inicialização.

---

## ⚠️ Importante

### Usuários Existentes

- Adicionar exercícios no JSON **não afeta usuários que já se registraram**
- Apenas **novos usuários** receberão os exercícios configurados no momento do registro
- Se quiser adicionar exercícios para usuários existentes, você precisará fazer isso manualmente via SQL

### Constraint UNIQUE

A tabela `exercises` tem constraint `UNIQUE(user_id, type)`, ou seja:
- Cada usuário pode ter apenas **1 exercício de cada tipo**
- Se tentar adicionar 2 exercícios com o mesmo `type`, o segundo será rejeitado

---

## 📋 Exemplos de Exercícios

### Exercícios de Força

```json
{
  "type": "squat",
  "name": "Agachamento",
  "is_active": true
},
{
  "type": "pushup",
  "name": "Flexão",
  "is_active": true
},
{
  "type": "pullup",
  "name": "Barra Fixa",
  "is_active": true
},
{
  "type": "deadlift",
  "name": "Levantamento Terra",
  "is_active": true
}
```

### Exercícios Cardiovasculares

```json
{
  "type": "burpee",
  "name": "Burpee",
  "is_active": true
},
{
  "type": "mountain_climber",
  "name": "Alpinista",
  "is_active": true
},
{
  "type": "jumping_jack",
  "name": "Polichinelo",
  "is_active": true
}
```

### Exercícios Isométricos

```json
{
  "type": "plank",
  "name": "Prancha",
  "is_active": true
},
{
  "type": "wall_sit",
  "name": "Cadeira na Parede",
  "is_active": true
}
```

---

## 🔧 Fallback

Se o arquivo `default-exercises.json` não for encontrado ou estiver com erro de sintaxe, o sistema usará exercícios padrão hardcoded:

```typescript
[
  { type: 'squat', name: 'Agachamento', is_active: true },
  { type: 'pushup', name: 'Flexão', is_active: true },
  { type: 'pullup', name: 'Barra Fixa', is_active: true },
  { type: 'plank', name: 'Prancha', is_active: true }
]
```

Você verá um log no console:
```
Failed to load default exercises config, using fallback
```

---

## 🧪 Como Testar

### 1. Modificar o JSON

Adicione um novo exercício:

```json
{
  "type": "burpee",
  "name": "Burpee",
  "is_active": true
}
```

### 2. Reiniciar Backend

```bash
npm run dev
```

Você verá no console:
```
Loaded 5 default exercises from config
```

### 3. Registrar Novo Usuário

```bash
POST /auth/register
{
  "email": "teste@example.com",
  "password": "Senha123!",
  "full_name": "Teste"
}
```

### 4. Verificar Exercícios

```bash
GET /exercises
Headers: Authorization: Bearer {token}
```

Deve retornar 5 exercícios (incluindo o novo).

---

## 📊 Validação JSON

Use um validador JSON online para verificar se o arquivo está correto:
- https://jsonlint.com/
- https://jsonformatter.org/

Exemplo de JSON válido:

```json
{
  "exercises": [
    {
      "type": "squat",
      "name": "Agachamento",
      "is_active": true
    }
  ]
}
```

Exemplo de JSON inválido:

```json
{
  "exercises": [
    {
      "type": "squat",
      "name": "Agachamento",
      "is_active": true  // ❌ Falta vírgula
    }
    {
      "type": "pushup",
      "name": "Flexão",
      "is_active": true
    }
  ]
}
```

---

## 🚀 Deploy em Produção

Ao fazer deploy, certifique-se de que:

1. O arquivo `src/config/default-exercises.json` está incluído no build
2. Se usar Docker, copie o arquivo no Dockerfile:
   ```dockerfile
   COPY src/config/default-exercises.json /app/dist/config/
   ```

3. Se usar compilação TypeScript, adicione ao `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "outDir": "./dist"
     },
     "include": [
       "src/**/*.ts",
       "src/config/**/*.json"
     ]
   }
   ```

---

## 📝 Logs

Ao iniciar o backend, você verá logs indicando o carregamento:

### Sucesso

```
Loaded 4 default exercises from config
```

### Erro

```
Failed to load default exercises config, using fallback: [error details]
```

---

**Dúvidas?** Consulte a documentação completa em `EXERCISES_AUTO_SEED.md`
