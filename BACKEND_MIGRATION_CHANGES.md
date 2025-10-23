# Backend API - Alterações de Migração

## Resumo das Mudanças

Todos os endpoints foram atualizados para refletir a nova estrutura do banco de dados após a migração de `profiles` → `users` e mudança de UUIDs para IDs sequenciais.

---

## Arquivos Modificados

### 1. `src/modules/auth/user-profile.service.ts`

**Alterações:**
- ✅ Tabela `profiles` renomeada para `users`
- ✅ Query agora busca por `uuid` em vez de `id`
- ✅ Interface `UserProfile` atualizada para incluir `id: number` e `uuid: string`
- ✅ Comentário atualizado mencionando tabela `users`

**Código-chave:**
```typescript
interface UserProfile {
  id: number;        // ← NOVO: ID sequencial
  uuid: string;      // ← UUID do Supabase Auth
  full_name?: string;
  is_dev?: boolean;
}

const { data, error } = await this.supabaseService.client
  .from('users')                    // ← Mudou de 'profiles'
  .select('id, uuid, full_name, is_dev')
  .eq('uuid', userId)               // ← Mudou de 'id'
  .single();
```

---

### 2. `src/modules/training/training.service.ts`

**Alterações:**
- ✅ Adicionado método helper `getUserIdFromUuid()` para converter UUID → INTEGER
- ✅ `createSession()`: agora usa `userIdInt` em vez de UUID
- ✅ `completeSession()`: converte userId e usa `session_id` como INTEGER
- ✅ `getHistory()`: converte userId para INTEGER
- ✅ `getSessionDetails()`: aceita `sessionId: number` em vez de `string`

**Código-chave:**
```typescript
// Método helper para conversão UUID → ID
private async getUserIdFromUuid(userUuid: string): Promise<number> {
  const { data, error } = await this.supabaseService.client
    .from('users')
    .select('id')
    .eq('uuid', userUuid)
    .single();

  if (error || !data) {
    throw new NotFoundException('User not found');
  }

  return data.id;
}

// Uso nos métodos
async createSession(userId: string, createSessionDto: CreateSessionDto) {
  const userIdInt = await this.getUserIdFromUuid(userId);

  const { data: session, error } = await this.supabaseService.client
    .from('training_sessions')
    .insert({
      user_id: userIdInt,  // ← INTEGER em vez de UUID
      exercise_type: createSessionDto.exercise_type,
      status: 'in_progress',
    })
    .select()
    .single();
}
```

---

### 3. `src/modules/gym-admin/gym.service.ts`

**Alterações:**
- ✅ `toggleUserStatus()`: parâmetro `userId` mudou de `string` para `number`
- ✅ `removeUser()`: parâmetro `userId` mudou de `string` para `number`

**Código-chave:**
```typescript
async toggleUserStatus(gymId: number, userId: number) {  // ← number em vez de string
  const { data: link } = await this.supabaseService.client
    .from('gym_user_links')
    .select('*')
    .eq('gym_id', gymId)
    .eq('user_id', userId)
    .single();
  // ...
}

async removeUser(gymId: number, userId: number) {  // ← number em vez de string
  const { error } = await this.supabaseService.client
    .from('gym_user_links')
    .delete()
    .eq('gym_id', gymId)
    .eq('user_id', userId);
  // ...
}
```

---

### 4. `src/modules/training/dto/complete-session.dto.ts`

**Alterações:**
- ✅ `session_id` mudou de `UUID` para `number`
- ✅ Validador mudou de `@IsUUID()` para `@IsInt()` + `@IsPositive()`
- ✅ Exemplo no Swagger atualizado de UUID para `1`

**Código-chave:**
```typescript
export class CompleteSessionDto {
  @ApiProperty({ example: 1, description: 'Session ID' })  // ← Mudou de UUID
  @IsInt()
  @IsPositive()
  session_id: number;  // ← Era string (UUID)

  // ... outros campos
}
```

---

### 5. `src/modules/training/training.controller.ts`

**Alterações:**
- ✅ Endpoint `GET /training/sessions/:id`: parâmetro `sessionId` mudou de `string` para `number`
- ✅ Documentação Swagger atualizada (`type: Number`)

**Código-chave:**
```typescript
@Get('sessions/:id')
@ApiOperation({ summary: 'Get session details' })
@ApiParam({ name: 'id', description: 'Session ID', type: Number })  // ← type: Number
async getSessionDetails(
  @CurrentUser('id') userId: string,
  @Param('id') sessionId: number,  // ← number em vez de string
) {
  return this.trainingService.getSessionDetails(userId, sessionId);
}
```

---

### 6. `src/modules/gym-admin/gym.controller.ts`

**Alterações:**
- ✅ Endpoint `PATCH /gyms/users/:userId/toggle`: parâmetro `userId` mudou de `string` para `number`
- ✅ Endpoint `DELETE /gyms/users/:userId`: parâmetro `userId` mudou de `string` para `number`
- ✅ Documentação Swagger atualizada (`type: Number`)

**Código-chave:**
```typescript
@Patch('users/:userId/toggle')
@ApiParam({ name: 'userId', description: 'User ID', type: Number })  // ← type: Number
async toggleUserStatus(
  @CurrentGym('id') gymId: number,
  @Param('userId') userId: number,  // ← number em vez de string
) {
  return this.gymService.toggleUserStatus(gymId, userId);
}

@Delete('users/:userId')
@ApiParam({ name: 'userId', description: 'User ID', type: Number })  // ← type: Number
async removeUser(
  @CurrentGym('id') gymId: number,
  @Param('userId') userId: number,  // ← number em vez de string
) {
  return this.gymService.removeUser(gymId, userId);
}
```

---

## Mapeamento de IDs

### Fluxo de Autenticação

1. **Supabase Auth** retorna `user.id` (UUID) após login
2. **UserProfileService** busca o perfil usando `uuid` e retorna `id` (INTEGER)
3. **Endpoints protegidos** recebem UUID via `@CurrentUser('id')` decorator
4. **Services** convertem UUID → INTEGER antes de consultar o banco

### Tabelas e Tipos de ID

| Tabela | Campo | Tipo | Descrição |
|--------|-------|------|-----------|
| `users` | `id` | SERIAL | Primary key (INTEGER) |
| `users` | `uuid` | UUID | Referência ao Supabase Auth |
| `training_sessions` | `id` | SERIAL | Primary key (INTEGER) |
| `training_sessions` | `user_id` | INTEGER | FK para `users.id` |
| `gym_user_links` | `user_id` | INTEGER | FK para `users.id` |

---

## Endpoints Atualizados

### Autenticação (sem alterações de estrutura)
- `POST /auth/register` ✅
- `POST /auth/login` ✅
- `POST /auth/logout` ✅

### Training
- `POST /training/sessions` ✅ (usa `user_id` INTEGER internamente)
- `POST /training/sessions/complete` ✅ (aceita `session_id` INTEGER)
- `GET /training/history` ✅ (filtra por `user_id` INTEGER)
- `GET /training/sessions/:id` ✅ (`:id` agora é INTEGER)

### Gym Management
- `GET /gyms/profile` ✅
- `GET /gyms/users` ✅ (retorna dados via `gym_users_view`)
- `PATCH /gyms/users/:userId/toggle` ✅ (`:userId` agora é INTEGER)
- `DELETE /gyms/users/:userId` ✅ (`:userId` agora é INTEGER)
- `GET /gyms/stats` ✅

### Exercises (sem alterações)
- `GET /exercises` ✅
- `GET /exercises/:type` ✅

---

## Checklist de Validação

Após executar a migração do banco de dados, teste os seguintes cenários:

### Autenticação
- [ ] Registrar novo usuário
- [ ] Login com usuário existente
- [ ] Verificar que `user.id` no token ainda é UUID (Supabase Auth)
- [ ] Verificar que perfil retornado contém `id` INTEGER e `uuid`

### Training Sessions
- [ ] Criar nova sessão de treino
- [ ] Completar sessão usando `session_id` INTEGER
- [ ] Buscar histórico de treinos
- [ ] Buscar detalhes de uma sessão específica (por ID INTEGER)

### Gym Management
- [ ] Listar usuários da academia (via `gym_users_view`)
- [ ] Alternar status de usuário (usando `userId` INTEGER)
- [ ] Remover usuário da academia (usando `userId` INTEGER)
- [ ] Buscar estatísticas da academia

---

## Notas Importantes

1. **Compatibilidade com Supabase Auth**: O UUID do Supabase Auth continua sendo usado para autenticação. A conversão UUID → INTEGER acontece internamente nos services.

2. **Performance**: A conversão UUID → INTEGER adiciona uma query extra. Considere cachear o mapeamento se houver problemas de performance.

3. **Swagger UI**: A documentação Swagger foi atualizada para refletir que `session_id` e `userId` agora são números inteiros.

4. **Breaking Changes para Frontend**:
   - `session_id` em requests deve ser INTEGER (não mais UUID)
   - `:userId` em rotas de gym deve ser INTEGER (não mais UUID)
   - Response de `gym_users_view` agora inclui `user_id` INTEGER

5. **View `gym_users_view`**: A view foi recriada no script de migração SQL e agora retorna `user_id` como INTEGER.

---

## Próximos Passos

1. ✅ Executar script de migração SQL
2. ⚠️ Atualizar aplicação frontend para usar IDs inteiros
3. ⚠️ Testar todos os endpoints em ambiente de desenvolvimento
4. ⚠️ Atualizar documentação da API
5. ⚠️ Fazer deploy gradual (staging → production)

---

**Data da Atualização**: 2025-10-22
**Versão**: 1.0.0
**Status**: ✅ Backend atualizado e pronto para testes
