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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const PORT = process.env.PORT || 3000;

const ROLE_NAMES = {
  FOUNDER: "👑・FUNDADOR",
  OWNER: "💎・DONO",
  LEADER: "⚜️・LÍDER",
  SUBLEADER: "🔱・SUB-LÍDER",
  MANAGER: "🎖️・GERENTE",
  ELITE: "🔥・ELITE",
  MEMBER: "🛡️・MEMBRO",
  RECRUIT: "🔰・RECRUTA",
  CANDIDATE: "📝・CANDIDATO",
  ADMIN: "🛠️・ADMINISTRADOR",
  MOD: "🔨・MODERADOR",
  RECRUITER: "🎫・RECRUTADOR"
};

/*
  A ordem está invertida de propósito.

  O Discord coloca cargos novos acima dos antigos.
  Assim, no final, FUNDADOR fica acima dos demais.
*/
const ROLE_ORDER = [
  ROLE_NAMES.CANDIDATE,
  ROLE_NAMES.RECRUIT,
  ROLE_NAMES.MEMBER,
  ROLE_NAMES.ELITE,
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.SUBLEADER,
  ROLE_NAMES.LEADER,
  ROLE_NAMES.OWNER,
  ROLE_NAMES.FOUNDER,
  ROLE_NAMES.RECRUITER,
  ROLE_NAMES.MOD,
  ROLE_NAMES.ADMIN
];

const STAFF_ROLES = [
  ROLE_NAMES.FOUNDER,
  ROLE_NAMES.OWNER,
  ROLE_NAMES.LEADER,
  ROLE_NAMES.SUBLEADER,
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.ADMIN,
  ROLE_NAMES.MOD,
  ROLE_NAMES.RECRUITER
];

/* =========================================================
   SERVIDOR HTTP PARA O RENDER
========================================================= */

http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("🍦 VANILLA BOT ONLINE");
}).listen(PORT, () => {
  console.log(`🌐 HTTP ativo na porta ${PORT}`);
});

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

function cleanChannelName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function getRole(guild, name) {
  return guild.roles.cache.find(r => r.name === name);
}

function isStaff(member) {
  if (!member || !member.roles) return false;

  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
    STAFF_ROLES.some(roleName =>
      member.roles.cache.some(role => role.name === roleName)
    )
  );
}

function getStaffRoles(guild) {
  return guild.roles.cache.filter(role =>
    STAFF_ROLES.includes(role.name)
  );
}

/* =========================================================
   CRIAÇÃO DOS CARGOS
========================================================= */

async function createRoles(guild) {
  console.log("🎭 Configurando cargos...");

  const me = guild.members.me;

  if (!me) {
    throw new Error("Não consegui encontrar o bot dentro do servidor.");
  }

  if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    throw new Error(
      "O bot precisa da permissão GERENCIAR CARGOS."
    );
  }

  for (const roleName of ROLE_ORDER) {
    let role = getRole(guild, roleName);

    if (!role) {
      role = await guild.roles.create({
        name: roleName,
        permissions: [],
        mentionable: false,
        reason: "Configuração automática VANILLA 3.0"
      });

      console.log(`✅ Cargo criado: ${roleName}`);
    } else {
      console.log(`↪️ Cargo já existe: ${roleName}`);
    }
  }

  /*
    Tenta organizar a hierarquia.
    O cargo do bot precisa continuar acima dos cargos VANILLA.
  */

  const botRole = guild.roles.cache.find(
    role => role.id === guild.members.me.roles.highest.id
  );

  if (!botRole) return;

  const positions = {};

  const finalOrder = [
    ROLE_NAMES.ADMIN,
    ROLE_NAMES.MOD,
    ROLE_NAMES.RECRUITER,
    ROLE_NAMES.FOUNDER,
    ROLE_NAMES.OWNER,
    ROLE_NAMES.LEADER,
    ROLE_NAMES.SUBLEADER,
    ROLE_NAMES.MANAGER,
    ROLE_NAMES.ELITE,
    ROLE_NAMES.MEMBER,
    ROLE_NAMES.RECRUIT,
    ROLE_NAMES.CANDIDATE
  ];

  let position = botRole.position - 1;

  for (const name of finalOrder) {
    const role = getRole(guild, name);

    if (role && position > 0) {
      positions[role.id] = position;
      position--;
    }
  }

  try {
    await guild.roles.setPositions(
      Object.entries(positions).map(([role, pos]) => ({
        role,
        position: pos
      }))
    );

    console.log("✅ Hierarquia organizada.");
  } catch (error) {
    console.log(
      "⚠️ Não consegui reorganizar automaticamente a hierarquia."
    );
  }
}

/* =========================================================
   CATEGORIAS E CANAIS
========================================================= */

const CATEGORIES = {
  INFO: "📌・INFORMAÇÕES",
  RECRUITMENT: "📝・RECRUTAMENTO",
  MEMBERS: "👥・MEMBROS",
  INTERNAL: "🔒・ÁREA INTERNA",
  COMMAND: "👑・COMANDO",
  TICKETS: "🎫・TICKETS",
  SYSTEM: "🤖・SISTEMA",
  VOICE: "🔊・SALAS DE VOZ"
};

async function getOrCreateCategory(guild, name) {
  let category = guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildCategory &&
      channel.name === name
  );

  if (!category) {
    category = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory
    });

    console.log(`📁 Categoria criada: ${name}`);
  }

  return category;
}

async function getOrCreateChannel(guild, name, category) {
  let channel = guild.channels.cache.find(
    channel =>
      channel.name === name &&
      channel.parentId === category.id
  );

  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: category.id
    });

    console.log(`💬 Canal criado: ${name}`);
  }

  return channel;
}

async function getOrCreateVoice(guild, name, category) {
  let channel = guild.channels.cache.find(
    channel =>
      channel.name === name &&
      channel.parentId === category.id &&
      channel.type === ChannelType.GuildVoice
  );

  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      parent: category.id
    });

    console.log(`🔊 Sala criada: ${name}`);
  }

  return channel;
}

/* =========================================================
   PERMISSÕES
========================================================= */

async function configurePermissions(guild, categories) {
  console.log("🔐 Configurando permissões...");

  const everyone = guild.roles.everyone;

  const recruit = getRole(guild, ROLE_NAMES.RECRUIT);
  const member = getRole(guild, ROLE_NAMES.MEMBER);
  const elite = getRole(guild, ROLE_NAMES.ELITE);
  const manager = getRole(guild, ROLE_NAMES.MANAGER);
  const subleader = getRole(guild, ROLE_NAMES.SUBLEADER);
  const leader = getRole(guild, ROLE_NAMES.LEADER);
  const owner = getRole(guild, ROLE_NAMES.OWNER);
  const founder = getRole(guild, ROLE_NAMES.FOUNDER);
  const admin = getRole(guild, ROLE_NAMES.ADMIN);
  const mod = getRole(guild, ROLE_NAMES.MOD);
  const recruiter = getRole(guild, ROLE_NAMES.RECRUITER);

  /*
    ÁREA PÚBLICA
  */

  const publicCategories = [
    categories.INFO,
    categories.RECRUITMENT,
    categories.MEMBERS
  ];

  for (const category of publicCategories) {
    await category.permissionOverwrites.edit(everyone, {
      ViewChannel: true
    });
  }

  /*
    ÁREA INTERNA
    Somente membros + cargos superiores
  */

  await categories.INTERNAL.permissionOverwrites.edit(everyone, {
    ViewChannel: false
  });

  const internalRoles = [
    member,
    elite,
    manager,
    subleader,
    leader,
    owner,
    founder,
    admin,
    mod
  ].filter(Boolean);

  for (const role of internalRoles) {
    await categories.INTERNAL.permissionOverwrites.edit(role, {
      ViewChannel: true
    });
  }

  /*
    COMANDO
    Somente liderança/administração
  */

  await categories.COMMAND.permissionOverwrites.edit(everyone, {
    ViewChannel: false
  });

  const commandRoles = [
    manager,
    subleader,
    leader,
    owner,
    founder,
    admin
  ].filter(Boolean);

  for (const role of commandRoles) {
    await categories.COMMAND.permissionOverwrites.edit(role, {
      ViewChannel: true
    });
  }

  /*
    SISTEMA
    Somente equipe
  */

  await categories.SYSTEM.permissionOverwrites.edit(everyone, {
    ViewChannel: false
  });

  const staffRoles = [
    manager,
    subleader,
    leader,
    owner,
    founder,
    admin,
    mod,
    recruiter
  ].filter(Boolean);

  for (const role of staffRoles) {
    await categories.SYSTEM.permissionOverwrites.edit(role, {
      ViewChannel: true
    });
  }

  /*
    TICKETS
    A categoria fica escondida.
    O bot libera cada ticket individualmente.
  */

  await categories.TICKETS.permissionOverwrites.edit(everyone, {
    ViewChannel: false
  });

  for (const role of staffRoles) {
    await categories.TICKETS.permissionOverwrites.edit(role, {
      ViewChannel: true,
      SendMessages: true
    });
  }

  /*
    SALAS DE VOZ
  */

  await categories.VOICE.permissionOverwrites.edit(everyone, {
    ViewChannel: true,
    Connect: true
  });

  console.log("✅ Permissões configuradas.");
}

/* =========================================================
   CRIAÇÃO DO SERVIDOR
========================================================= */

async function createServerStructure(guild) {
  console.log("🏗️ Criando estrutura VANILLA...");

  const info = await getOrCreateCategory(
    guild,
    CATEGORIES.INFO
  );

  const recruitment = await getOrCreateCategory(
    guild,
    CATEGORIES.RECRUITMENT
  );

  const members = await getOrCreateCategory(
    guild,
    CATEGORIES.MEMBERS
  );

  const internal = await getOrCreateCategory(
    guild,
    CATEGORIES.INTERNAL
  );

  const command = await getOrCreateCategory(
    guild,
    CATEGORIES.COMMAND
  );

  const tickets = await getOrCreateCategory(
    guild,
    CATEGORIES.TICKETS
  );

  const system = await getOrCreateCategory(
    guild,
    CATEGORIES.SYSTEM
  );

  const voice = await getOrCreateCategory(
    guild,
    CATEGORIES.VOICE
  );

  const categories = {
    INFO: info,
    RECRUITMENT: recruitment,
    MEMBERS: members,
    INTERNAL: internal,
    COMMAND: command,
    TICKETS: tickets,
    SYSTEM: system,
    VOICE: voice
  };

  /* INFORMAÇÕES */

  await getOrCreateChannel(
    guild,
    "👋・boas-vindas",
    info
  );

  await getOrCreateChannel(
    guild,
    "📜・regras",
    info
  );

  await getOrCreateChannel(
    guild,
    "📢・comunicados",
    info
  );

  await getOrCreateChannel(
    guild,
    "📖・historia-da-vanilla",
    info
  );

  await getOrCreateChannel(
    guild,
    "👑・hierarquia",
    info
  );

  /* RECRUTAMENTO */

  await getOrCreateChannel(
    guild,
    "📥・como-entrar",
    recruitment
  );

  await getOrCreateChannel(
    guild,
    "📝・formulario",
    recruitment
  );

  await getOrCreateChannel(
    guild,
    "🎫・entrevista",
    recruitment
  );

  await getOrCreateChannel(
    guild,
    "📂・candidatos",
    recruitment
  );

  await getOrCreateChannel(
    guild,
    "⏳・em-analise",
    recruitment
  );

  await getOrCreateChannel(
    guild,
    "✅・aprovados",
    recruitment
  );

  /* MEMBROS */

  await getOrCreateChannel(
    guild,
    "💬・chat-geral",
    members
  );

  await getOrCreateChannel(
    guild,
    "📸・midia",
    members
  );

  await getOrCreateChannel(
    guild,
    "🎮・momentos-rp",
    members
  );

  await getOrCreateChannel(
    guild,
    "😂・resenha",
    members
  );

  await getOrCreateChannel(
    guild,
    "🏆・conquistas",
    members
  );

  /* ÁREA INTERNA */

  await getOrCreateChannel(
    guild,
    "💬・chat-interno",
    internal
  );

  await getOrCreateChannel(
    guild,
    "📡・comunicacao",
    internal
  );

  await getOrCreateChannel(
    guild,
    "📍・operacoes-rp",
    internal
  );

  await getOrCreateChannel(
    guild,
    "🚘・veiculos",
    internal
  );

  await getOrCreateChannel(
    guild,
    "📦・inventario",
    internal
  );

  await getOrCreateChannel(
    guild,
    "📋・relatorios",
    internal
  );

  /* COMANDO */

  await getOrCreateChannel(
    guild,
    "👑・sala-do-lider",
    command
  );

  await getOrCreateChannel(
    guild,
    "💎・conselho",
    command
  );

  await getOrCreateChannel(
    guild,
    "📋・reunioes",
    command
  );

  await getOrCreateChannel(
    guild,
    "📊・relatorio-geral",
    command
  );

  await getOrCreateChannel(
    guild,
    "⚠️・advertencias",
    command
  );

  await getOrCreateChannel(
    guild,
    "📈・promocoes",
    command
  );

  await getOrCreateChannel(
    guild,
    "📁・documentos",
    command
  );

  /* TICKETS */

  await getOrCreateChannel(
    guild,
    "🎫・abrir-ticket",
    tickets
  );

  /* SISTEMA */

  await getOrCreateChannel(
    guild,
    "🤖・comandos",
    system
  );

  await getOrCreateChannel(
    guild,
    "📜・logs",
    system
  );

  await getOrCreateChannel(
    guild,
    "🔔・notificacoes",
    system
  );

  /* VOZ */

  await getOrCreateVoice(
    guild,
    "🔊・Sala Geral",
    voice
  );

  await getOrCreateVoice(
    guild,
    "🎮・Resenha",
    voice
  );

  await getOrCreateVoice(
    guild,
    "📡・Comunicação RP",
    voice
  );

  await getOrCreateVoice(
    guild,
    "🚘・Equipe RP",
    voice
  );

  await getOrCreateVoice(
    guild,
    "👑・Comando",
    voice
  );

  await configurePermissions(guild, categories);

  return categories;
}

/* =========================================================
   MENSAGEM DE BOAS-VINDAS
========================================================= */

async function sendWelcome(guild) {
  const channel = guild.channels.cache.find(
    c => c.name === "👋・boas-vindas"
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("🍦 Bem-vindo à VANILLA")
    .setDescription(
      "Seja bem-vindo ao servidor oficial da VANILLA!\n\n" +
      "Leia as regras, confira as informações e acompanhe os comunicados."
    )
    .setFooter({
      text: "VANILLA • Organização RP"
    });

  await channel.send({
    embeds: [embed]
  }).catch(() => {});
}

/* =========================================================
   PAINEL DE TICKET
========================================================= */

async function sendTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle("🎫 Atendimento VANILLA")
    .setDescription(
      "Precisa falar com a equipe?\n\n" +
      "Clique no botão abaixo para abrir um ticket privado.\n\n" +
      "📌 Utilize o ticket para:\n" +
      "• Dúvidas\n" +
      "• Recrutamento\n" +
      "• Suporte\n" +
      "• Problemas internos\n" +
      "• Outros assuntos relacionados à VANILLA"
    )
    .setFooter({
      text: "VANILLA • Sistema de Atendimento"
    });

  const button = new ButtonBuilder()
    .setCustomId("vanilla_open_ticket")
    .setLabel("Abrir Ticket")
    .setEmoji("🎫")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  await channel.send({
    embeds: [embed],
    components: [row]
  });
}

/* =========================================================
   COMANDOS SLASH
========================================================= */

const commands = [
  {
    name: "setup-vanilla",
    description: "Configura automaticamente o servidor VANILLA."
  },
  {
    name: "ticket",
    description: "Publica o painel de atendimento."
  }
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      CLIENT_ID,
      GUILD_ID
    ),
    {
      body: commands
    }
  );

  console.log("✅ Comandos slash registrados.");
}

/* =========================================================
   EVENTO READY
========================================================= */

client.once("ready", async () => {
  console.log(
    `🍦 VANILLA BOT online: ${client.user.tag}`
  );

  try {
    await registerCommands();
  } catch (error) {
    console.error(
      "❌ Erro ao registrar comandos:",
      error
    );
  }
});

/* =========================================================
   INTERAÇÕES
========================================================= */

client.on("interactionCreate", async interaction => {

  /* =====================================================
     SETUP
  ===================================================== */

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "setup-vanilla"
  ) {

    if (
      !interaction.memberPermissions.has(
        PermissionsBitField.Flags.Administrator
      ) &&
      !interaction.memberPermissions.has(
        PermissionsBitField.Flags.ManageGuild
      )
    ) {
      return interaction.reply({
        content:
          "❌ Você precisa de **Administrador** ou **Gerenciar Servidor**.",
        ephemeral: true
      });
    }

    await interaction.deferReply({
      ephemeral: true
    });

    try {
      const guild = interaction.guild;

      await createRoles(guild);

      await createServerStructure(guild);

      await sendWelcome(guild);

      await interaction.editReply(
        "✅ **VANILLA 3.0 configurada com sucesso!**\n\n" +
        "🎭 Cargos criados\n" +
        "📁 Categorias criadas\n" +
        "💬 Canais criados\n" +
        "🔐 Permissões configuradas\n" +
        "🎫 Sistema de tickets preparado\n" +
        "📜 Logs preparados\n" +
        "🔊 Salas de voz criadas"
      );

    } catch (error) {

      console.error("❌ ERRO NO SETUP:", error);

      await interaction.editReply(
        "❌ Ocorreu um erro durante a configuração.\n\n" +
        "Confira os logs do Render para descobrir o problema."
      ).catch(() => {});
    }

    return;
  }

  /* =====================================================
     COMANDO TICKET
  ===================================================== */

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "ticket"
  ) {

    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content:
          "❌ Você não tem permissão para usar este comando.",
        ephemeral: true
      });
    }

    const channel = interaction.guild.channels.cache.find(
      c => c.name === "🎫・abrir-ticket"
    );

    if (!channel) {
      return interaction.reply({
        content:
          "❌ O canal `🎫・abrir-ticket` não existe. Execute `/setup-vanilla` primeiro.",
        ephemeral: true
      });
    }

    await sendTicketPanel(channel);

    return interaction.reply({
      content:
        `✅ Painel de tickets enviado em ${channel}.`,
      ephemeral: true
    });
  }

  /* =====================================================
     ABRIR TICKET
  ===================================================== */

  if (
    interaction.isButton() &&
    interaction.customId === "vanilla_open_ticket"
  ) {

    const guild = interaction.guild;
    const user = interaction.user;

    const ticketCategory = guild.channels.cache.find(
      c =>
        c.name === "🎫・TICKETS" &&
        c.type === ChannelType.GuildCategory
    );

    if (!ticketCategory) {
      return interaction.reply({
        content:
          "❌ A categoria de tickets não existe. Execute `/setup-vanilla`.",
        ephemeral: true
      });
    }

    const existingTicket = guild.channels.cache.find(
      channel =>
        channel.parentId === ticketCategory.id &&
        channel.topic === `ticket:${user.id}`
    );

    if (existingTicket) {
      return interaction.reply({
        content:
          `❌ Você já possui um ticket aberto: ${existingTicket}`,
        ephemeral: true
      });
    }

    const staffRoles = getStaffRoles(guild);

    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [
          PermissionsBitField.Flags.ViewChannel
        ]
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles
        ]
      }
    ];

    for (const role of staffRoles.values()) {
      permissionOverwrites.push({
        id: role.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles
        ]
      });
    }

    const ticketChannel = await guild.channels.create({
      name: `ticket-${cleanChannelName(user.username)}`,
      type: ChannelType.GuildText,
      parent: ticketCategory.id,
      topic: `ticket:${user.id}`,
      permissionOverwrites
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket VANILLA")
      .setDescription(
        `Olá ${user}!\n\n` +
        "Seu atendimento foi criado.\n" +
        "Explique o motivo do contato e aguarde a equipe.\n\n" +
        "🔒 Este canal é privado."
      )
      .setFooter({
        text: "VANILLA • Atendimento"
      });

    const claimButton = new ButtonBuilder()
      .setCustomId("vanilla_claim_ticket")
      .setLabel("Assumir")
      .setEmoji("👋")
      .setStyle(ButtonStyle.Primary);

    const closeButton = new ButtonBuilder()
      .setCustomId("vanilla_close_ticket")
      .setLabel("Fechar")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Secondary);

    const deleteButton = new ButtonBuilder()
      .setCustomId("vanilla_delete_ticket")
      .setLabel("Excluir")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(
      claimButton,
      closeButton,
      deleteButton
    );

    const mentions = staffRoles
      .map(role => `<@&${role.id}>`)
      .join(" ");

    await ticketChannel.send({
      content: `${user} ${mentions}`,
      embeds: [embed],
      components: [row]
    });

    const logChannel = guild.channels.cache.find(
      c => c.name === "📜・logs"
    );

    if (logChannel) {
      await logChannel.send(
        `🎫 Ticket aberto por ${user} em ${ticketChannel}.`
      ).catch(() => {});
    }

    return interaction.reply({
      content:
        `✅ Seu ticket foi criado: ${ticketChannel}`,
      ephemeral: true
    });
  }

  /* =====================================================
     ASSUMIR TICKET
  ===================================================== */

  if (
    interaction.isButton() &&
    interaction.customId === "vanilla_claim_ticket"
  ) {

    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content:
          "❌ Apenas a equipe pode assumir tickets.",
        ephemeral: true
      });
    }

    await interaction.reply({
      content:
        `👋 Ticket assumido por ${interaction.user}.`
    });

    const logChannel = interaction.guild.channels.cache.find(
      c => c.name === "📜・logs"
    );

    if (logChannel) {
      await logChannel.send(
        `👋 ${interaction.user} assumiu o ticket ${interaction.channel}.`
      ).catch(() => {});
    }

    return;
  }

  /* =====================================================
     FECHAR TICKET
  ===================================================== */

  if (
    interaction.isButton() &&
    interaction.customId === "vanilla_close_ticket"
  ) {

    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content:
          "❌ Apenas a equipe pode fechar tickets.",
        ephemeral: true
      });
    }

    const topic = interaction.channel.topic || "";

    if (!topic.startsWith("ticket:")) {
      return interaction.reply({
        content:
          "❌ Este canal não é um ticket.",
        ephemeral: true
      });
    }

    const userId = topic.replace("ticket:", "");

    await interaction.channel.permissionOverwrites.edit(
      userId,
      {
        SendMessages: false
      }
    );

    await interaction.reply({
      content:
        "🔒 **Ticket fechado.**\n\n" +
        "A equipe ainda pode acessar este canal."
    });

    const logChannel = interaction.guild.channels.cache.find(
      c => c.name === "📜・logs"
    );

    if (logChannel) {
      await logChannel.send(
        `🔒 ${interaction.user} fechou o ticket ${interaction.channel}.`
      ).catch(() => {});
    }

    return;
  }

  /* =====================================================
     EXCLUIR TICKET
  ===================================================== */

  if (
    interaction.isButton() &&
    interaction.customId === "vanilla_delete_ticket"
  ) {

    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content:
          "❌ Apenas a equipe pode excluir tickets.",
        ephemeral: true
      });
    }

    const channelName = interaction.channel.name;

    const logChannel = interaction.guild.channels.cache.find(
      c => c.name === "📜・logs"
    );

    if (logChannel) {
      await logChannel.send(
        `🗑️ ${interaction.user} excluiu o ticket #${channelName}.`
      ).catch(() => {});
    }

    await interaction.reply(
      "🗑️ Ticket será excluído em alguns segundos..."
    );

    setTimeout(async () => {
      await interaction.channel.delete().catch(() => {});
    }, 2000);

    return;
  }
});

/* =========================================================
   ERROS
========================================================= */

client.on("error", error => {
  console.error("❌ Erro do Discord:", error);
});

process.on("unhandledRejection", error => {
  console.error("❌ Promise rejeitada:", error);
});

/* =========================================================
   LOGIN
========================================================= */

if (!TOKEN) {
  console.error(
    "❌ DISCORD_TOKEN não configurado."
  );
  process.exit(1);
}

client.login(TOKEN);
