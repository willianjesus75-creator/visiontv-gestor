# VisionTV Gestor

Base inicial do painel web em Next.js + Supabase.

## 1. Requisitos
- Node.js 20 ou superior
- Projeto Supabase ativo
- Repositório GitHub `visiontv-gestor`

## 2. Configurar variáveis
Crie um arquivo `.env.local` na raiz, copiando `.env.example`, e preencha:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Use somente a chave pública/anon no navegador. Nunca coloque `service_role` no código do frontend ou no GitHub.

## 3. Instalar e executar
```bash
npm install
npm run dev
```
Abra http://localhost:3000.

## 4. Login
Crie o usuário em Supabase → Authentication → Users e entre com esse e-mail e senha.

## 5. Banco de dados
O painel inicial consulta as tabelas `empresas`, `clientes`, `assinaturas`, `pagamentos` e `despesas` para contar registros. Antes de implementar cadastros e cálculos financeiros, confirme as colunas reais de cada tabela e as políticas RLS.

## 6. Publicação
Depois de validar localmente, conecte o repositório ao serviço de hospedagem Next.js e configure as mesmas variáveis de ambiente no painel de hospedagem. O domínio personalizado será conectado nessa etapa.
