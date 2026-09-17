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

// =====================================================
// CONFIGURAÇÃO DO BOT
// =====================================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const PORT = process.env.PORT || 3000;

// =====================================================
// SERVIDOR HTTP - RENDER
// =====================================================

http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("🍦 VANILLA BOT ONLINE");
}).listen(PORT, () => {
  console.log(`🌐 HTTP ativo na porta ${PORT}`);
});

// =====================================================
// CARGOS DA VANILLA
// =====================================================

const ROLE_NAMES = [
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

// Cargos que poderão visualizar e atender tickets
const STAFF_ROLES = [
  "👑・FUNDADOR",
  "💎・DONO",
  "⚜️・LÍDER",
  "🔱・SUB-LÍDER",
  "🎖️・GERENTE"
];

// =====================================================
// CATEGORIAS E CANAIS
// =====================================================

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

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function getRole(guild, roleName) {
  return guild.roles.cache.find(
    role => role.name === roleName
  );
}

function getStaffRoles(guild) {
  return STAFF_ROLES
    .map(name => getRole(guild, name))
    .filter(Boolean);
}

function getLogsChannel(guild) {
  return guild.channels.cache.find(
    channel =>
      channel.name === "📜・logs" &&
      channel.type === ChannelType.GuildText
  );
}

function getTicketCategory(guild) {
  return guild.channels.cache.find(
    channel =>
      channel.name === "🎫・TICKETS" &&
      channel.type === ChannelType.GuildCategory
  );
}

function isStaff(member) {
  if (!member) return false;

  return (
    member.permissions.has(
      PermissionsBitField.Flags.Administrator
    ) ||
    member.roles.cache.some(role =>
      STAFF_ROLES.includes(role.name)
    )
  );
}

// =====================================================
// CRIAÇÃO DOS CARGOS
// =====================================================

async function createRoles(guild) {

  console.log("🔧 Verificando permissão Gerenciar Cargos...");

  const botMember = guild.members.me;

  if (!botMember) {
    throw new Error(
      "O bot não foi encontrado no servidor."
    );
  }

  const canManageRoles = botMember.permissions.has(
    PermissionsBitField.Flags.ManageRoles
  );

  console.log(
    `🛡️ Gerenciar Cargos: ${canManageRoles}`
  );

  if (!canManageRoles) {
    throw new Error(
      "O bot não possui a permissão GERENCIAR CARGOS."
    );
  }

  const createdRoles = {};

  for (const roleName of ROLE_NAMES) {

    let role = getRole(guild, roleName);

    if (!role) {

      console.log(
        `➕ Criando cargo: ${roleName}`
      );

      role = await guild.roles.create({
        name: roleName,
        permissions: [],
        reason: "Configuração da VANILLA"
      });

      console.log(
        `✅ Cargo criado: ${roleName}`
      );

    } else {

      console.log(
        `✔️ Cargo já existe: ${roleName}`
      );
    }

    createdRoles[roleName] = role;
  }

  return createdRoles;
}

// =====================================================
// CRIAÇÃO DOS CANAIS
// =====================================================

async function createChannels(guild) {

  console.log("📁 Verificando categorias e canais...");

  for (const [categoryName, channels] of Object.entries(
    CATEGORIES
  )) {

    let category = guild.channels.cache.find(
      channel =>
        channel.name === categoryName &&
        channel.type === ChannelType.GuildCategory
    );

    if (!category) {

      console.log(
        `📁 Criando categoria: ${categoryName}`
      );

      category = await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory
      });
    }

    for (const channelName of channels) {

      const exists = guild.channels.cache.find(
        channel =>
          channel.name === channelName &&
          channel.parentId === category.id
      );

      if (!exists) {

        console.log(
          `💬 Criando canal: ${channelName}`
        );

        await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: category.id
        });
      }
    }
  }

  // ===================================================
  // CATEGORIA DE VOZ
  // ===================================================

  let voiceCategory = guild.channels.cache.find(
    channel =>
      channel.name === "🔊・SALAS DE VOZ" &&
      channel.type === ChannelType.GuildCategory
  );

  if (!voiceCategory) {

    voiceCategory = await guild.channels.create({
      name: "🔊・SALAS DE VOZ",
      type: ChannelType.GuildCategory
    });
  }

  for (const channelName of VOICE_CHANNELS) {

    const exists = guild.channels.cache.find(
      channel =>
        channel.name === channelName &&
        channel.parentId === voiceCategory.id
    );

    if (!exists) {

      await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: voiceCategory.id
      });
    }
  }
}

// =====================================================
// MENSAGEM DE BOAS-VINDAS
// =====================================================

async function createWelcomeMessage(guild) {

  const channel = guild.channels.cache.find(
    c =>
      c.name === "👋・boas-vindas" &&
      c.type === ChannelType.GuildText
  );

  if (!channel) return;

  const messages = await channel.messages.fetch({
    limit: 20
  });

  const alreadySent = messages.some(
    message =>
      message.author.id === client.user.id &&
      message.content.includes("VANILLA")
  );

  if (!alreadySent) {

    await channel.send(
      "🍦 **VANILLA**\n\n" +
      "Bem-vindo(a) ao servidor oficial da VANILLA!\n\n" +
      "📜 Leia as regras.\n" +
      "📢 Acompanhe os comunicados.\n" +
      "🎫 Caso precise de ajuda, utilize o sistema de tickets."
    );
  }
}

// =====================================================
// CONFIGURAÇÃO COMPLETA
// =====================================================

async function setupGuild(guild) {

  console.log(
    `🚀 Iniciando configuração da VANILLA em ${guild.name}`
  );

  await createRoles(guild);

  await createChannels(guild);

  await createWelcomeMessage(guild);

  console.log(
    "🎉 CONFIGURAÇÃO VANILLA FINALIZADA!"
  );
}

// =====================================================
// COMANDOS SLASH
// =====================================================

const commands = [
  {
    name: "setup-vanilla",
    description:
      "Cria e verifica a estrutura completa da VANILLA"
  },

  {
    name: "ticket",
    description:
      "Envia o painel de suporte da VANILLA"
  }
];

// =====================================================
// BOT ONLINE
// =====================================================

client.once("ready", async () => {

  console.log(
    `🍦 VANILLA BOT ONLINE: ${client.user.tag}`
  );

  const rest = new REST({
    version: "10"
  }).setToken(
    process.env.DISCORD_TOKEN
  );

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

    console.log(
      "✅ Comandos slash registrados."
    );

  } catch (error) {

    console.error(
      "❌ Erro ao registrar comandos:",
      error
    );
  }
});

// =====================================================
// INTERAÇÕES - COMANDOS
// =====================================================

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isChatInputCommand()) return;

    // =================================================
    // /SETUP-VANILLA
    // =================================================

    if (
      interaction.commandName ===
      "setup-vanilla"
    ) {

      await interaction.deferReply({
        ephemeral: true
      });

      try {

        console.log(
          `⚙️ Setup executado por ${interaction.user.tag}`
        );

        await setupGuild(
          interaction.guild
        );

        await interaction.editReply(
          "✅ **VANILLA configurada com sucesso!**\n\n" +
          "Cargos, categorias, canais e sistema básico foram verificados/criados."
        );

      } catch (error) {

        console.error(
          "❌ ERRO NO SETUP:",
          error
        );

        await interaction.editReply(
          "❌ **Ocorreu um erro.**\n\n" +
          "Verifique os Logs do Render para identificar o problema."
        );
      }

      return;
    }

    // =================================================
    // /TICKET
    // =================================================

    if (
      interaction.commandName === "ticket"
    ) {

      if (!isStaff(interaction.member)) {

        return interaction.reply({
          content:
            "❌ Você não possui permissão para usar este comando.",
          ephemeral: true
        });
      }

      await interaction.deferReply({
        ephemeral: true
      });

      try {

        const existingPanel =
          interaction.channel;

        const embed = new EmbedBuilder()
          .setTitle("🎫 SUPORTE VANILLA")
          .setDescription(
            "Precisa de ajuda?\n\n" +
            "Clique no botão abaixo para abrir um atendimento privado com a equipe da VANILLA.\n\n" +
            "🔒 Seu ticket será visível somente para você e para a equipe autorizada."
          )
          .setFooter({
            text: "VANILLA • Sistema de Suporte"
          });

        const openButton =
          new ButtonBuilder()
            .setCustomId("vanilla_open_ticket")
            .setLabel("Abrir Ticket")
            .setEmoji("🎫")
            .setStyle(ButtonStyle.Primary);

        const row =
          new ActionRowBuilder()
            .addComponents(openButton);

        await existingPanel.send({
          embeds: [embed],
          components: [row]
        });

        await interaction.editReply(
          "✅ **Painel de tickets enviado!**"
        );

      } catch (error) {

        console.error(
          "❌ Erro ao enviar painel:",
          error
        );

        await interaction.editReply(
          "❌ Não consegui enviar o painel de tickets."
        );
      }

      return;
    }
  }
);

// =====================================================
// INTERAÇÕES - BOTÕES
// =====================================================

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isButton()) return;

    // =================================================
    // ABRIR TICKET
    // =================================================

    if (
      interaction.customId ===
      "vanilla_open_ticket"
    ) {

      try {

        const guild = interaction.guild;
        const user = interaction.user;

        // ---------------------------------------------
        // Verifica se já existe ticket
        // ---------------------------------------------

        const existingTicket =
          guild.channels.cache.find(
            channel =>
              channel.type === ChannelType.GuildText &&
              channel.topic === `ticket:${user.id}`
          );

        if (existingTicket) {

          return interaction.reply({
            content:
              `❌ Você já possui um ticket aberto: ${existingTicket}`,
            ephemeral: true
          });
        }

        // ---------------------------------------------
        // Categoria de tickets
        // ---------------------------------------------

        let category =
          getTicketCategory(guild);

        if (!category) {

          category =
            await guild.channels.create({
              name: "🎫・TICKETS",
              type: ChannelType.GuildCategory
            });
        }

        // ---------------------------------------------
        // Permissões
        // ---------------------------------------------

        const permissionOverwrites = [

          // @everyone não vê
          {
            id: guild.id,

            deny: [
              PermissionsBitField.Flags.ViewChannel
            ]
          },

          // Usuário que abriu
          {
            id: user.id,

            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks
            ]
          }
        ];

        // ---------------------------------------------
        // Adiciona cargos da equipe
        // ---------------------------------------------

        const staffRoles =
          getStaffRoles(guild);

        for (const role of staffRoles) {

          permissionOverwrites.push({
            id: role.id,

            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageMessages,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks
            ]
          });
        }

        // ---------------------------------------------
        // Cria ticket
        // ---------------------------------------------

        const safeUsername =
          user.username
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 20) || "usuario";

        const ticketChannel =
          await guild.channels.create({

            name: `🎫・ticket-${safeUsername}`,

            type: ChannelType.GuildText,

            parent: category.id,

            topic: `ticket:${user.id}`,

            permissionOverwrites
          });

        // ---------------------------------------------
        // Botões do ticket
        // ---------------------------------------------

        const claimButton =
          new ButtonBuilder()
            .setCustomId("vanilla_claim_ticket")
            .setLabel("Assumir Ticket")
            .setEmoji("🟢")
            .setStyle(ButtonStyle.Success);

        const closeButton =
          new ButtonBuilder()
            .setCustomId("vanilla_close_ticket")
            .setLabel("Fechar Ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Secondary);

        const deleteButton =
          new ButtonBuilder()
            .setCustomId("vanilla_delete_ticket")
            .setLabel("Excluir Ticket")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger);

        const row =
          new ActionRowBuilder()
            .addComponents(
              claimButton,
              closeButton,
              deleteButton
            );

        const embed =
          new EmbedBuilder()
            .setTitle("🎫 Atendimento VANILLA")
            .setDescription(
              `Olá, ${user}!\n\n` +
              "Seu ticket foi aberto com sucesso.\n\n" +
              "📝 Explique detalhadamente o motivo do contato.\n" +
              "👥 Um membro da equipe irá atender você.\n\n" +
              "🔒 **Não abra vários tickets para o mesmo assunto.**"
            )
            .setFooter({
              text:
                "VANILLA • Sistema de Atendimento"
            });

        await ticketChannel.send({
          content:
            `${user} ${staffRoles
              .map(role => `<@&${role.id}>`)
              .join(" ")}`,

          embeds: [embed],

          components: [row]
        });

        // ---------------------------------------------
        // Log
        // ---------------------------------------------

        const logs =
          getLogsChannel(guild);

        if (logs) {

          await logs.send(
            `🎫 **Ticket aberto**\n` +
            `👤 Usuário: ${user}\n` +
            `📁 Canal: ${ticketChannel}\n` +
            `🕒 Data: <t:${Math.floor(Date.now() / 1000)}:F>`
          );
        }

        await interaction.reply({
          content:
            `✅ Seu ticket foi criado: ${ticketChannel}`,
          ephemeral: true
        });

      } catch (error) {

        console.error(
          "❌ ERRO AO ABRIR TICKET:",
          error
        );

        if (!interaction.replied) {

          await interaction.reply({
            content:
              "❌ Não foi possível criar o ticket.",
            ephemeral: true
          });
        }
      }

      return;
    }

    // =================================================
    // ASSUMIR TICKET
    // =================================================

    if (
      interaction.customId ===
      "vanilla_claim_ticket"
    ) {

      if (!isStaff(interaction.member)) {

        return interaction.reply({
          content:
            "❌ Apenas a equipe autorizada pode assumir tickets.",
          ephemeral: true
        });
      }

      const channel =
        interaction.channel;

      if (
        !channel.topic ||
        !channel.topic.startsWith("ticket:")
      ) {

        return interaction.reply({
          content:
            "❌ Este canal não é um ticket.",
          ephemeral: true
        });
      }

      await interaction.reply(
        `🟢 **Ticket assumido!**\n\n👤 Responsável: ${interaction.user}`
      );

      const logs =
        getLogsChannel(interaction.guild);

      if (logs) {

        await logs.send(
          `🟢 **Ticket assumido**\n` +
          `🎫 Canal: ${channel}\n` +
          `👤 Responsável: ${interaction.user}\n` +
          `🕒 <t:${Math.floor(Date.now() / 1000)}:F>`
        );
      }

      return;
    }

    // =================================================
    // FECHAR TICKET
    // =================================================

    if (
      interaction.customId ===
      "vanilla_close_ticket"
    ) {

      if (!isStaff(interaction.member)) {

        return interaction.reply({
          content:
            "❌ Apenas a equipe autorizada pode fechar tickets.",
          ephemeral: true
        });
      }

      const channel =
        interaction.channel;

      if (
        !channel.topic ||
        !channel.topic.startsWith("ticket:")
      ) {

        return interaction.reply({
          content:
            "❌ Este canal não é um ticket.",
          ephemeral: true
        });
      }

      await interaction.reply(
        "🔒 **Ticket fechado.**\n\nO atendimento foi encerrado pela equipe."
      );

      // Remove permissão de envio do usuário
      const userId =
        channel.topic.replace("ticket:", "");

      try {

        await channel.permissionOverwrites.edit(
          userId,
          {
            SendMessages: false
          }
        );

      } catch (error) {

        console.error(
          "Erro ao bloquear usuário:",
          error
        );
      }

      const logs =
        getLogsChannel(interaction.guild);

      if (logs) {

        await logs.send(
          `🔒 **Ticket fechado**\n` +
          `🎫 Canal: ${channel}\n` +
          `👤 Fechado por: ${interaction.user}\n` +
          `🕒 <t:${Math.floor(Date.now() / 1000)}:F>`
        );
      }

      return;
    }

    // =================================================
    // EXCLUIR TICKET
    // =================================================

    if (
      interaction.customId ===
      "vanilla_delete_ticket"
    ) {

      if (!isStaff(interaction.member)) {

        return interaction.reply({
          content:
            "❌ Apenas a equipe autorizada pode excluir tickets.",
          ephemeral: true
        });
      }

      const channel =
        interaction.channel;

      if (
        !channel.topic ||
        !channel.topic.startsWith("ticket:")
      ) {

        return interaction.reply({
          content:
            "❌ Este canal não é um ticket.",
          ephemeral: true
        });
      }

      const channelName =
        channel.name;

      const logs =
        getLogsChannel(interaction.guild);

      if (logs) {

        await logs.send(
          `🗑️ **Ticket excluído**\n` +
          `📁 Canal: **${channelName}**\n` +
          `👤 Excluído por: ${interaction.user}\n` +
          `🕒 <t:${Math.floor(Date.now() / 1000)}:F>`
        );
      }

      await interaction.reply(
        "🗑️ **Excluindo ticket...**"
      );

      setTimeout(async () => {

        try {

          await channel.delete(
            "Ticket encerrado pela equipe VANILLA"
          );

        } catch (error) {

          console.error(
            "❌ Erro ao excluir ticket:",
            error
          );
        }

      }, 2000);

      return;
    }
  }
);

// =====================================================
// ERROS
// =====================================================

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Unhandled Rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ Uncaught Exception:",
      error
    );
  }
);

// =====================================================
// LOGIN
// =====================================================

client.login(
  process.env.DISCORD_TOKEN
);
