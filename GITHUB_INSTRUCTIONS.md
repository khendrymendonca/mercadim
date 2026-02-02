# 📤 Como subir o projeto para o GitHub

## Passo 1: Criar o repositório no GitHub
1. Acesse: https://github.com/new
2. Nome do repositório: `jireh-app`
3. Descrição: `Jireh - O provedor das suas economias no mercado (PWA)`
4. Escolha: **Público** ou **Privado**
5. **NÃO** marque nenhuma opção de inicializar (README, .gitignore, licença)
6. Clique em **Create repository**

## Passo 2: Conectar e fazer push
Após criar o repositório, copie a URL que aparecerá (exemplo: `https://github.com/khendrymendonca/smart-price-tracker.git`)

Depois execute os comandos abaixo no terminal (já estamos no diretório correto):

```bash
git remote add origin https://github.com/SEU_USUARIO/jireh-app.git
git branch -M main
git push -u origin main
```

**Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub!**

---

## ✅ Pronto!
Seu projeto estará no GitHub e você poderá acessá-lo de qualquer lugar!

### 🔗 Links Úteis
- **Repositório**: https://github.com/SEU_USUARIO/jireh-app
- **Deploy gratuito**: Você pode fazer deploy no Vercel, Netlify ou GitHub Pages

### 📱 Para testar o PWA:
1. Faça deploy do projeto
2. Acesse pelo celular
3. Clique em "Adicionar à tela inicial"
4. Use como um app nativo!
