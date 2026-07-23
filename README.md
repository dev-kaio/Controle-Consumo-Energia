# Controle de Consumo de Energia 🏠⚡

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-ffca28?style=flat&logo=firebase&logoColor=black)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

## Descrição do Projeto

O **Controle de Consumo de Energia** é um sistema desenvolvido para monitorar o consumo elétrico de apartamentos utilizando a **ESP32**.  

O sistema permite:

- Medir o consumo de energia em tempo real.
- Armazenar dados no **Firebase**, garantindo acesso remoto e seguro.
- Visualizar informações através de um **dashboard web interativo**, incluindo gráficos de consumo diário, semanal e mensal.
- Autenticação de usuários via Firebase Auth.

---

## Funcionalidades

- 📊 **Dashboard Web**: gráficos de consumo detalhados.  
- 🔌 **Medição de energia**: coleta de dados através da ESP32.  
- ☁️ **Armazenamento em nuvem**: dados salvos no Firebase Realtime Database.  
- 🔐 **Autenticação**: login e registro de usuários.  
- 👥 **Controle de usuários**: cada usuário visualiza apenas seus próprios dados.

---

## Tecnologias Utilizadas

- **Hardware**: ESP32 
- **Frontend**: React + Vite (PWA)  
- **Backend**: Node.js com Express  
- **Banco de dados**: Firebase Realtime Database  
- **Autenticação**: Firebase Authentication  

---

## Estrutura do Projeto

```
backend/    Node.js + Express + Firebase Admin (API; serve o build do frontend)
frontend/   SPA React + Vite (PWA) — fala com a API só por HTTP
firmware/   Código da ESP32 (esp.cpp)
docs/       Arquitetura, segurança, tarifas, design system
```

`backend/` e `frontend/` estão preparados para virar repositórios separados.

## Como rodar

```bash
# backend (API na porta 3000)
cd backend
npm install
cp .env.example .env   # preencher credenciais do Firebase
npm run dev

# frontend em desenvolvimento (porta 5173, hot reload)
cd frontend
npm install
npm run dev
```

Para rodar só com o backend (como em produção): `cd frontend && npm run build`
e abrir http://localhost:3000. Detalhes em `frontend/README.md`.

Na raiz do monorepo, `npm run dev`, `npm test` e `npm run seed` encaminham
para o backend.
