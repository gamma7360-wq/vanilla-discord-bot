require("dotenv").config();
const http = require("http");
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const ROLE_DEFS = [
  ["👑・FUNDADOR", 0],
  ["💎・DONO", 0],
  ["⚜️・LÍDER", 0],
  ["🔱・SUB-LÍDER", 0],
  ["🎖️・GERENTE", 0],
  ["🔥・ELITE", 0],
  ["🛡️・MEMBRO", 0],
  ["🔰・RECRUTA", 0],
  ["📝・CANDIDATO", 0],
  ["🛠️・ADMINISTRADOR", 0],
  ["🔨・MODERADOR", 0],
  ["🎫・RECRUTADOR", 0],
  ["🤖・BOT", 0]
];

const STRUCTURE = [
  ["📌・INFORMAÇÕES", [
    "👋・boas-vindas",
    "📜・regras",
    "📢・comunicados",
    "📖・história-da-vanilla",
    "👑・hierarquia",
    "📋・códigos-internos",
    "📅・agenda"
  ]],
  ["📝・RECRUTAMENTO", [
    "📥・como-entrar",
    "📝・formulário",
    "🎫・entrevista",
    "📂・candidatos",
    "⏳・em-análise",
    "✅・aprovados",
    "❌・reprovados"
  ]],
  ["👥・MEMBROS", [
    "💬・chat-geral",
    "📸・mídia",
    "🎮・momentos-rp",
    "😂・resenha",
    "📊・metas",
    "🏆・conquistas",
    "📣・avisos-internos"
  ]],
  ["🔒・ÁREA INTERNA", [
    "💬・chat-interno",
    "📡・comunicação",
    "📍・operações-rp",
    "🚘・veículos",
    "📦・inventário",
    "📋・relatórios",
    "💰・controle-financeiro"
  ]],
  ["👑・COMANDO", [
    "👑・sala-do-líder",
    "💎・conselho",
    "📋・reuniões",
    "📊・relatório-geral",
    "⚠️・advertências",
    "📈・promoções",
    "📁・documentos"
  ]],
  ["🎫・SUPORTE", [
    "🎫・abrir-ticket",
    "📨・tickets",
    "❓・dúvidas",
    "📢・denúncias-internas"
  ]],
  ["🤖・SISTEMA", [
    "🤖・comandos",
    "📜・logs",
    "🔔・notificações",
    "📊・registro-de-atividades"
  ]]
];

const VOICE = [
  "🔊・sala-geral",
  "🎮・resenha",
  "📡・comunicação-rp",
  "🚘・equipe-rp",
  "👑・sala-do-comando",
  "💤・ausente"
];

function findRole(guild, name) {
  return guild.roles.cache.find(role => role.name === name);
}

async function createRole(guild, name) {
  let role = findRole(guild, name);

  if (!role) {
    role = await guild.roles.create({
      name,
      permissions: [],
      reason: "VANILLA"
    });
  }

  return role;
}

async function createTextChannel(guild, parent, name) {
  let channel = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildText &&
      c.name === name &&
      c.parentId === parent.id
  );

  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: parent.id,
      reason: "VANILLA"
    });
  }

  return channel;
}

async function createVoiceChannel(guild, parent, name) {
  let channel = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildVoice &&
      c.name === name &&
      c.parentId === parent.id
  );

  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      parent: parent.id,
      reason: "VANILLA"
    });
  }

  return channel;
}

async function setup(guild) {
  for (const [roleName] of ROLE_DEFS) {
    await createRole(guild, roleName);
  }

  for (const [categoryName, channels] of STRUCTURE) {
    let category = guild.channels.cache.find(
      c =>
        c.type === ChannelType.GuildCategory &&
        c.name === categoryName
    );

    if (!category) {
      category = await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory,
        reason: "VANILLA"
      });
    }

    for (const channelName of channels) {
      await createTextChannel(guild, category, channelName);
    }
  }

  let voiceCategory = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildCategory &&
      c.name === "🔊・SALAS DE VOZ"
  );

  if (!voiceCategory) {
    voiceCategory = await guild.channels.create({
      name: "🔊・SALAS DE VOZ",
      type: ChannelType.GuildCategory,
      reason: "VANILLA"
    });
  }

  for (const voiceName of VOICE) {
    await createVoiceChannel(guild, voiceCategory, voiceName);
  }

  const welcome = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildText &&
      c.name === "👋・boas-vindas"
  );

  if (welcome) {
    await welcome.send(
      "🍦 **BEM-VINDO À VANILLA**\n\n" +
      "Seja bem-vindo(a) à nossa família!\n\n" +
      "Leia as regras e conheça nossa estrutura.\n\n" +
      "**LEALDADE • RESPEITO • UNIÃO**"
    ).catch(() => {});
  }
}

function staffRoles(guild) {
  return [
    "🎫・RECRUTADOR",
    "🔨・MODERADOR",
    "🎖️・GERENTE",
    "🔱・SUB-LÍDER",
    "⚜️・LÍDER",
    "💎・DONO",
    "👑・FUNDADOR",
    "🛠️・ADMINISTRADOR"
  ]
    .map(name => findRole(guild, name))
    .filter(Boolean);
}

async function openTicket(interaction) {
  const guild = interaction.guild;

  const existing = guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildText &&
      channel.topic === `ticket:${interaction.user.id}`
  );

  if (existing) {
    return interaction.reply({
      content: `❌ Você já possui um ticket: ${existing}`,
      ephemeral: true
    });
  }

  let category = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildCategory &&
      c.name === "🎫・TICKETS"
  );

  if (!category) {
    category = await guild.channels.create({
      name: "🎫・TICKETS",
      type: ChannelType.GuildCategory,
      reason: "VANILLA Tickets"
    });
  }

  const staff = staffRoles(guild);

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    },
    ...staff.map(role => ({
      id: role.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }))
  ];

  const username =
    interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 18) || "usuario";

  const ticket = await guild.channels.create({
    name: `ticket-${username}`,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `ticket:${interaction.user.id}`,
    permissionOverwrites: overwrites,
    reason: `Ticket VANILLA`
  });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("Assumir Ticket")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Fechar Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setTitle("🍦 | TICKET VANILLA")
    .setDescription(
      `Olá, ${interaction.user}!\n\n` +
      "Descreva seu assunto abaixo. Um membro da equipe irá atender você."
    )
    .setFooter({
      text: "VANILLA • Suporte"
    });

  await ticket.send({
    embeds: [embed],
    components: [buttons]
  });

  await interaction.reply({
    content: `✅ Ticket criado: ${ticket}`,
    ephemeral: true
  });
}

client.once("ready", async () => {
  console.log(`🍦 VANILLA BOT online: ${client.user.tag}`);

  try {
    const commands = [
      new SlashCommandBuilder()
        .setName("setup-vanilla")
        .setDescription("Cria a estrutura da VANILLA.")
        .setDefaultMemberPermissions(
          PermissionFlagsBits.ManageGuild
        ),

      new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Publica o painel de tickets.")
        .setDefaultMemberPermissions(
          PermissionFlagsBits.ManageGuild
        )
    ];

    const rest = new REST({ version: "10" }).setToken(
      process.env.DISCORD_TOKEN
    );

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      {
        body: commands.map(command => command.toJSON())
      }
    );

    console.log("✅ Comandos slash registrados.");
  } catch (error) {
    console.error(
      "❌ Erro ao registrar comandos:",
      error.message
    );
  }
});

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-vanilla") {
        if (
          !interaction.memberPermissions?.has(
            PermissionFlagsBits.Administrator
          ) &&
          !interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageGuild
          )
        ) {
          return interaction.reply({
            content:
              "❌ Você precisa de Administrador ou Gerenciar Servidor.",
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        await setup(interaction.guild);

        return interaction.editReply(
          "🍦 **VANILLA configurada com sucesso!**"
        );
      }

      if (interaction.commandName === "ticket") {
        if (
          !interaction.memberPermissions?.has(
            PermissionFlagsBits.Administrator
          ) &&
          !interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageGuild
          )
        ) {
          return interaction.reply({
            content:
              "❌ Apenas a equipe administrativa pode publicar o painel.",
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle("🍦 | SUPORTE VANILLA")
          .setDescription(
            "Precisa de ajuda?\n\n" +
            "Clique em **Abrir Ticket** para criar um atendimento privado."
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_open")
            .setLabel("Abrir Ticket")
            .setEmoji("🎫")
            .setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({
          embeds: [embed],
          components: [row]
        });

        return interaction.reply({
          content: "✅ Painel enviado.",
          ephemeral: true
        });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "ticket_open") {
        return openTicket(interaction);
      }

      const staff = staffRoles(interaction.guild);

      const isStaff =
        staff.some(role =>
          interaction.member.roles.cache.has(role.id)
        ) ||
        interaction.memberPermissions?.has(
          PermissionFlagsBits.Administrator
        );

      if (interaction.customId === "ticket_claim") {
        if (!isStaff) {
          return interaction.reply({
            content: "❌ Você não pode assumir tickets.",
            ephemeral: true
          });
        }

        return interaction.reply(
          `🎫 **Ticket assumido por ${interaction.user}.**`
        );
      }

      if (interaction.customId === "ticket_close") {
        const owner = interaction.channel.topic?.startsWith("ticket:")
          ? interaction.channel.topic.split(":")[1]
          : null;

        if (!isStaff && interaction.user.id !== owner) {
          return interaction.reply({
            content: "❌ Você não pode fechar este ticket.",
            ephemeral: true
          });
        }

        await interaction.reply("🔒 Ticket sendo fechado...");

        setTimeout(() => {
          interaction.channel
            .delete("Ticket fechado")
            .catch(() => {});
        }, 1500);
      }
    }
  } catch (error) {
    console.error(error);

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: "❌ Ocorreu um erro.",
        ephemeral: true
      }).catch(() => {});
    } else {
      await interaction.reply({
        content: "❌ Ocorreu um erro.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("VANILLA Discord Bot online");
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 HTTP ativo na porta ${PORT}`);
  });

client.login(process.env.DISCORD_TOKEN);
