const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const http = require("http");
require("dotenv").config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===============================
// SERVIDOR HTTP PARA O RENDER
// ===============================
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("VANILLA BOT ONLINE");
}).listen(PORT, () => {
  console.log(`🌐 HTTP ativo na porta ${PORT}`);
});

// ===============================
// CARGOS
// ===============================
const ROLES = [
  "👑・FUNDADOR",
  "💎・DONO",
  "⚜️・LÍDER",
  "🔱・SUB-LÍDER",
  "🎖️・GERENTE",
  "🔥・ELITE",
  "🛡️・MEMBRO",
  "🔰・RECRUTA",
  "📝・CANDIDATO"
];

// ===============================
// CATEGORIAS E CANAIS
// ===============================
const CATEGORIES = {
  "📌・INFORMAÇÕES": [
    "👋・boas-vindas",
    "📜・regras",
    "📢・comunicados",
    "📖・história-da-vanilla",
    "👑・hierarquia",
    "📋・códigos-internos",
    "📅・agenda"
  ],

  "📝・RECRUTAMENTO": [
    "📥・como-entrar",
    "📝・formulário",
    "🎫・entrevista",
    "📂・candidatos",
    "⏳・em-análise",
    "✅・aprovados",
    "❌・reprovados"
  ],

  "👥・MEMBROS": [
    "💬・chat-geral",
    "📸・mídia",
    "🎮・momentos-rp",
    "😂・resenha",
    "📊・metas",
    "🏆・conquistas",
    "📣・avisos-internos"
  ],

  "🔒・ÁREA INTERNA": [
    "💬・chat-interno",
    "📡・comunicação",
    "📍・operações-rp",
    "🚘・veículos",
    "📦・inventário",
    "📋・relatórios",
    "💰・controle-financeiro"
  ],

  "👑・COMANDO": [
    "👑・sala-do-líder",
    "💎・conselho",
    "📋・reuniões",
    "📊・relatório-geral",
    "⚠️・advertências",
    "📈・promoções",
    "📁・documentos"
  ],

  "🎫・SUPORTE": [
    "🎫・abrir-ticket",
    "📨・tickets",
    "❓・dúvidas",
    "📢・denúncias-internas"
  ],

  "🤖・SISTEMA": [
    "🤖・comandos",
    "📜・logs",
    "🔔・notificações",
    "📊・registro-de-atividades"
  ]
};

const VOICE_CHANNELS = [
  "🔊・sala-geral",
  "🎮・resenha",
  "📡・comunicação-rp",
  "🚘・equipe-rp",
  "👑・sala-do-comando",
  "💤・ausente"
];

// ===============================
// FUNÇÃO PARA CRIAR CARGOS
// ===============================
async function createRoles(guild) {
  console.log("🔧 Verificando permissões...");

  const me = guild.members.me;

  if (!me) {
    throw new Error("Não consegui encontrar o bot dentro do servidor.");
  }

  console.log(
    `🤖 Bot: ${me.user.tag}`
  );

  console.log(
    `🛡️ Manage Roles: ${
      me.permissions.has(PermissionsBitField.Flags.ManageRoles)
    }`
  );

  if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    throw new Error(
      "O bot não possui a permissão GERENCIAR CARGOS."
    );
  }

  const createdRoles = {};

  for (const roleName of ROLES) {
    let role = guild.roles.cache.find(
      r => r.name === roleName
    );

    if (!role) {
      console.log(`➕ Criando cargo: ${roleName}`);

      role = await guild.roles.create({
        name: roleName,
        permissions: [],
        reason: "Configuração automática VANILLA"
      });

      console.log(`✅ Cargo criado: ${roleName}`);
    } else {
      console.log(`✔️ Cargo já existe: ${roleName}`);
    }

    createdRoles[roleName] = role;
  }

  return createdRoles;
}

// ===============================
// FUNÇÃO PARA CRIAR ESTRUTURA
// ===============================
async function setupGuild(guild) {
  console.log("🚀 Iniciando configuração VANILLA...");

  const roles = await createRoles(guild);

  // CATEGORIAS
  for (const [categoryName, channels] of Object.entries(CATEGORIES)) {
    let category = guild.channels.cache.find(
      c =>
        c.name === categoryName &&
        c.type === ChannelType.GuildCategory
    );

    if (!category) {
      console.log(`📁 Criando categoria: ${categoryName}`);

      category = await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory
      });
    }

    for (const channelName of channels) {
      const exists = guild.channels.cache.find(
        c =>
          c.name === channelName &&
          c.parentId === category.id
      );

      if (!exists) {
        console.log(`💬 Criando canal: ${channelName}`);

        await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: category.id
        });
      }
    }
  }

  // CATEGORIA DE VOZ
  let voiceCategory = guild.channels.cache.find(
    c =>
      c.name === "🔊・SALAS DE VOZ" &&
      c.type === ChannelType.GuildCategory
  );

  if (!voiceCategory) {
    voiceCategory = await guild.channels.create({
      name: "🔊・SALAS DE VOZ",
      type: ChannelType.GuildCategory
    });
  }

  for (const channelName of VOICE_CHANNELS) {
    const exists = guild.channels.cache.find(
      c =>
        c.name === channelName &&
        c.parentId === voiceCategory.id
    );

    if (!exists) {
      await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: voiceCategory.id
      });
    }
  }

  // MENSAGEM DE BOAS-VINDAS
  const welcome = guild.channels.cache.find(
    c => c.name === "👋・boas-vindas"
  );

  if (welcome) {
    const messages = await welcome.messages.fetch({
      limit: 10
    });

    const alreadySent = messages.some(
      m =>
        m.author.id === client.user.id &&
        m.content.includes("VANILLA")
    );

    if (!alreadySent) {
      await welcome.send(
        "🍦 **VANILLA**\n\nBem-vindo(a) ao servidor oficial da VANILLA!\n\nLeia as regras e acompanhe os comunicados."
      );
    }
  }

  console.log("🎉 CONFIGURAÇÃO VANILLA FINALIZADA!");

  return true;
}

// ===============================
// COMANDO /SETUP-VANILLA
// ===============================
const commands = [
  {
    name: "setup-vanilla",
    description: "Cria a estrutura completa do servidor VANILLA"
  },
  {
    name: "ticket",
    description: "Envia o painel de tickets"
  }
];

// ===============================
// BOT ONLINE
// ===============================
client.once("ready", async () => {
  console.log(`🍦 VANILLA BOT ONLINE: ${client.user.tag}`);

  const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      {
        body: commands
      }
    );

    console.log("✅ Comandos slash registrados.");
  } catch (error) {
    console.error("❌ Erro ao registrar comandos:", error);
  }
});

// ===============================
// INTERAÇÕES
// ===============================
client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "setup-vanilla") {

    await interaction.deferReply({ ephemeral: true });

    try {

      console.log(
        `⚙️ /setup-vanilla executado por ${interaction.user.tag}`
      );

      await setupGuild(interaction.guild);

      await interaction.editReply(
        "✅ **VANILLA configurada com sucesso!**\n\nCargos, categorias e canais foram verificados/criados."
      );

    } catch (error) {

      console.error("❌ ERRO NO SETUP:", error);

      await interaction.editReply(
        "❌ Ocorreu um erro durante a configuração.\n\nVeja os **Logs do Render** para descobrir o motivo."
      );
    }
  }

  // ===============================
  // /TICKET
  // ===============================
  if (interaction.commandName === "ticket") {

    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("🎫 Suporte VANILLA")
      .setDescription(
        "Precisa de ajuda?\n\nClique no botão abaixo para abrir um ticket privado com a equipe."
      );

    const button = new ButtonBuilder()
      .setCustomId("abrir_ticket")
      .setLabel("Abrir Ticket")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
      .addComponents(button);

    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    await interaction.editReply(
      "✅ Painel de tickets enviado!"
    );
  }
});

// ===============================
// BOTÕES DO TICKET
// ===============================
client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;

  if (interaction.customId === "abrir_ticket") {

    const guild = interaction.guild;

    const existing = guild.channels.cache.find(
      c => c.topic === `ticket:${interaction.user.id}`
    );

    if (existing) {
      return interaction.reply({
        content: `❌ Você já possui um ticket aberto: ${existing}`,
        ephemeral: true
      });
    }

    const category = guild.channels.cache.find(
      c =>
        c.name === "🎫・TICKETS" &&
        c.type === ChannelType.GuildCategory
    );

    let ticketCategory = category;

    if (!ticketCategory) {
      ticketCategory = await guild.channels.create({
        name: "🎫・TICKETS",
        type: ChannelType.GuildCategory
      });
    }

    const channel = await guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: ticketCategory.id,
      topic: `ticket:${interaction.user.id}`,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ]
    });

    await channel.send(
      `🎫 **Ticket aberto por ${interaction.user}**\n\nAguarde o atendimento da equipe VANILLA.`
    );

    await interaction.reply({
      content: `✅ Ticket criado: ${channel}`,
      ephemeral: true
    });
  }
});

// ===============================
// LOGIN
// ===============================
client.login(process.env.DISCORD_TOKEN);
