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

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* =========================================================
   CARGOS
========================================================= */

const ROLES = {
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
   Ordem da maior para a menor.

   Os cargos administrativos ficam abaixo
   da hierarquia principal.
*/

const HIERARCHY = [
  ROLES.FOUNDER,
  ROLES.OWNER,
  ROLES.LEADER,
  ROLES.SUBLEADER,
  ROLES.MANAGER,
  ROLES.ELITE,
  ROLES.MEMBER,
  ROLES.RECRUIT,
  ROLES.CANDIDATE,
  ROLES.ADMIN,
  ROLES.MOD,
  ROLES.RECRUITER
];

const STAFF_ROLES = [
  ROLES.FOUNDER,
  ROLES.OWNER,
  ROLES.LEADER,
  ROLES.SUBLEADER,
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.MOD,
  ROLES.RECRUITER
];

/* =========================================================
   CATEGORIAS
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

/* =========================================================
   HTTP PARA RENDER
========================================================= */

http
  .createServer((req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("🍦 VANILLA BOT ONLINE");
  })
  .listen(PORT, () => {
    console.log(`🌐 HTTP ativo na porta ${PORT}`);
  });

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

function getRole(guild, name) {
  return guild.roles.cache.find(
    role => role.name === name
  );
}

function getCategory(guild, name) {
  return guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildCategory &&
      channel.name === name
  );
}

function getTextChannel(guild, name) {
  return guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildText &&
      channel.name === name
  );
}

function cleanName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function isStaff(member) {
  if (!member) return false;

  if (
    member.permissions.has(
      PermissionsBitField.Flags.Administrator
    )
  ) {
    return true;
  }

  if (
    member.permissions.has(
      PermissionsBitField.Flags.ManageGuild
    )
  ) {
    return true;
  }

  return STAFF_ROLES.some(roleName =>
    member.roles.cache.some(
      role => role.name === roleName
    )
  );
}

function getStaffRoles(guild) {
  return guild.roles.cache.filter(role =>
    STAFF_ROLES.includes(role.name)
  );
}

/* =========================================================
   PERMISSÃO SEGURA
========================================================= */

async function safePermission(
  channel,
  target,
  permissions,
  description
) {
  try {
    await channel.permissionOverwrites.edit(
      target,
      permissions
    );

    console.log(`✅ Permissão: ${description}`);

    return true;
  } catch (error) {
    console.log(
      `⚠️ Falha de permissão: ${description} | Código: ${error.code || "?"}`
    );

    return false;
  }
}

/* =========================================================
   CARGOS
========================================================= */

async function createRoles(guild) {
  console.log("🎭 Configurando cargos...");

  const botMember = guild.members.me;

  if (!botMember) {
    throw new Error(
      "Não consegui localizar o bot no servidor."
    );
  }

  if (
    !botMember.permissions.has(
      PermissionsBitField.Flags.ManageRoles
    )
  ) {
    throw new Error(
      "O bot precisa da permissão GERENCIAR CARGOS."
    );
  }

  for (const roleName of HIERARCHY) {
    let role = getRole(guild, roleName);

    if (!role) {
      try {
        role = await guild.roles.create({
          name: roleName,
          permissions: [],
          mentionable: false,
          reason: "Configuração VANILLA"
        });

        console.log(
          `✅ Cargo criado: ${roleName}`
        );
      } catch (error) {
        console.log(
          `❌ Não consegui criar ${roleName}: ${error.code || error.message}`
        );
      }
    } else {
      console.log(
        `↪️ Cargo já existe: ${roleName}`
      );
    }
  }

  /*
    Recarrega os cargos depois da criação.
  */

  await guild.roles.fetch();

  const botRole = guild.members.me.roles.highest;

  if (!botRole) return;

  /*
    Coloca os cargos VANILLA abaixo do bot.
  */

  let position = botRole.position - 1;

  for (const roleName of HIERARCHY) {
    const role = getRole(guild, roleName);

    if (!role) continue;

    if (role.id === botRole.id) continue;

    if (position <= 0) break;

    try {
      await role.setPosition(position);
      position--;
    } catch (error) {
      console.log(
        `⚠️ Não consegui posicionar ${roleName}.`
      );
    }
  }

  console.log("✅ Hierarquia organizada.");
}

/* =========================================================
   CATEGORIAS
========================================================= */

async function createCategory(guild, name) {
  let category = getCategory(guild, name);

  if (category) {
    console.log(
      `↪️ Categoria já existe: ${name}`
    );

    return category;
  }

  category = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory
  });

  console.log(
    `📁 Categoria criada: ${name}`
  );

  return category;
}

/* =========================================================
   CANAL DE TEXTO
========================================================= */

async function createTextChannel(
  guild,
  name,
  category
) {
  let channel = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildText &&
      c.name === name &&
      c.parentId === category.id
  );

  if (channel) {
    console.log(
      `↪️ Canal já existe: ${name}`
    );

    return channel;
  }

  channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category.id
  });

  console.log(
    `💬 Canal criado: ${name}`
  );

  return channel;
}

/* =========================================================
   CANAL DE VOZ
========================================================= */

async function createVoiceChannel(
  guild,
  name,
  category
) {
  let channel = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildVoice &&
      c.name === name &&
      c.parentId === category.id
  );

  if (channel) {
    console.log(
      `↪️ Sala já existe: ${name}`
    );

    return channel;
  }

  channel = await guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: category.id
  });

  console.log(
    `🔊 Sala criada: ${name}`
  );

  return channel;
}

/* =========================================================
   ESTRUTURA
========================================================= */

async function createStructure(guild) {
  console.log(
    "🏗️ Criando estrutura VANILLA..."
  );

  const info = await createCategory(
    guild,
    CATEGORIES.INFO
  );

  const recruitment = await createCategory(
    guild,
    CATEGORIES.RECRUITMENT
  );

  const members = await createCategory(
    guild,
    CATEGORIES.MEMBERS
  );

  const internal = await createCategory(
    guild,
    CATEGORIES.INTERNAL
  );

  const command = await createCategory(
    guild,
    CATEGORIES.COMMAND
  );

  const tickets = await createCategory(
    guild,
    CATEGORIES.TICKETS
  );

  const system = await createCategory(
    guild,
    CATEGORIES.SYSTEM
  );

  const voice = await createCategory(
    guild,
    CATEGORIES.VOICE
  );

  /* =====================================================
     INFORMAÇÕES
  ===================================================== */

  await createTextChannel(
    guild,
    "👋・boas-vindas",
    info
  );

  await createTextChannel(
    guild,
    "📜・regras",
    info
  );

  await createTextChannel(
    guild,
    "📢・comunicados",
    info
  );

  await createTextChannel(
    guild,
    "📖・historia-da-vanilla",
    info
  );

  await createTextChannel(
    guild,
    "👑・hierarquia",
    info
  );

  /* =====================================================
     RECRUTAMENTO
  ===================================================== */

  await createTextChannel(
    guild,
    "📥・como-entrar",
    recruitment
  );

  await createTextChannel(
    guild,
    "📝・formulario",
    recruitment
  );

  await createTextChannel(
    guild,
    "🎫・entrevista",
    recruitment
  );

  await createTextChannel(
    guild,
    "📂・candidatos",
    recruitment
  );

  await createTextChannel(
    guild,
    "⏳・em-analise",
    recruitment
  );

  await createTextChannel(
    guild,
    "✅・aprovados",
    recruitment
  );

  await createTextChannel(
    guild,
    "❌・reprovados",
    recruitment
  );

  /* =====================================================
     MEMBROS
  ===================================================== */

  await createTextChannel(
    guild,
    "💬・chat-geral",
    members
  );

  await createTextChannel(
    guild,
    "📸・midia",
    members
  );

  await createTextChannel(
    guild,
    "🎮・momentos-rp",
    members
  );

  await createTextChannel(
    guild,
    "😂・resenha",
    members
  );

  await createTextChannel(
    guild,
    "📊・metas",
    members
  );

  await createTextChannel(
    guild,
    "🏆・conquistas",
    members
  );

  /* =====================================================
     ÁREA INTERNA
  ===================================================== */

  await createTextChannel(
    guild,
    "💬・chat-interno",
    internal
  );

  await createTextChannel(
    guild,
    "📡・comunicacao",
    internal
  );

  await createTextChannel(
    guild,
    "📍・operacoes-rp",
    internal
  );

  await createTextChannel(
    guild,
    "🚘・veiculos",
    internal
  );

  await createTextChannel(
    guild,
    "📦・inventario",
    internal
  );

  await createTextChannel(
    guild,
    "📋・relatorios",
    internal
  );

  /* =====================================================
     COMANDO
  ===================================================== */

  await createTextChannel(
    guild,
    "👑・sala-do-lider",
    command
  );

  await createTextChannel(
    guild,
    "💎・conselho",
    command
  );

  await createTextChannel(
    guild,
    "📋・reunioes",
    command
  );

  await createTextChannel(
    guild,
    "📊・relatorio-geral",
    command
  );

  await createTextChannel(
    guild,
    "⚠️・advertencias",
    command
  );

  await createTextChannel(
    guild,
    "📈・promocoes",
    command
  );

  await createTextChannel(
    guild,
    "📁・documentos",
    command
  );

  /* =====================================================
     TICKETS
  ===================================================== */

  await createTextChannel(
    guild,
    "🎫・abrir-ticket",
    tickets
  );

  /* =====================================================
     SISTEMA
  ===================================================== */

  await createTextChannel(
    guild,
    "🤖・comandos",
    system
  );

  await createTextChannel(
    guild,
    "📜・logs",
    system
  );

  await createTextChannel(
    guild,
    "🔔・notificacoes",
    system
  );

  /* =====================================================
     VOZ
  ===================================================== */

  await createVoiceChannel(
    guild,
    "🔊・Sala Geral",
    voice
  );

  await createVoiceChannel(
    guild,
    "🎮・Resenha",
    voice
  );

  await createVoiceChannel(
    guild,
    "📡・Comunicação RP",
    voice
  );

  await createVoiceChannel(
    guild,
    "🚘・Equipe RP",
    voice
  );

  await createVoiceChannel(
    guild,
    "👑・Comando",
    voice
  );

  console.log(
    "✅ Estrutura criada."
  );

  return {
    info,
    recruitment,
    members,
    internal,
    command,
    tickets,
    system,
    voice
  };
}

/* =========================================================
   PERMISSÕES
========================================================= */

async function configurePermissions(
  guild,
  categories
) {
  console.log(
    "🔐 Configurando permissões..."
  );

  const everyone = guild.roles.everyone;

  const member = getRole(
    guild,
    ROLES.MEMBER
  );

  const elite = getRole(
    guild,
    ROLES.ELITE
  );

  const manager = getRole(
    guild,
    ROLES.MANAGER
  );

  const subleader = getRole(
    guild,
    ROLES.SUBLEADER
  );

  const leader = getRole(
    guild,
    ROLES.LEADER
  );

  const owner = getRole(
    guild,
    ROLES.OWNER
  );

  const founder = getRole(
    guild,
    ROLES.FOUNDER
  );

  const admin = getRole(
    guild,
    ROLES.ADMIN
  );

  const mod = getRole(
    guild,
    ROLES.MOD
  );

  const recruiter = getRole(
    guild,
    ROLES.RECRUITER
  );

  /* =====================================================
     CARGOS DE ACESSO
  ===================================================== */

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

  const commandRoles = [
    manager,
    subleader,
    leader,
    owner,
    founder,
    admin
  ].filter(Boolean);

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

  /* =====================================================
     INFORMAÇÕES
     TODOS PODEM VER
  ===================================================== */

  await safePermission(
    categories.info,
    everyone,
    {
      ViewChannel: true
    },
    "Informações → todos"
  );

  /* =====================================================
     RECRUTAMENTO
     TODOS PODEM VER
  ===================================================== */

  await safePermission(
    categories.recruitment,
    everyone,
    {
      ViewChannel: true
    },
    "Recrutamento → todos"
  );

  /* =====================================================
     MEMBROS
  ===================================================== */

  await safePermission(
    categories.members,
    everyone,
    {
      ViewChannel: false
    },
    "Membros → @everyone"
  );

  for (const role of internalRoles) {
    await safePermission(
      categories.members,
      role,
      {
        ViewChannel: true
      },
      `Membros → ${role.name}`
    );
  }

  /* =====================================================
     ÁREA INTERNA
  ===================================================== */

  await safePermission(
    categories.internal,
    everyone,
    {
      ViewChannel: false
    },
    "Área Interna → @everyone"
  );

  for (const role of internalRoles) {
    await safePermission(
      categories.internal,
      role,
      {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      },
      `Área Interna → ${role.name}`
    );
  }

  /* =====================================================
     COMANDO
  ===================================================== */

  await safePermission(
    categories.command,
    everyone,
    {
      ViewChannel: false
    },
    "Comando → @everyone"
  );

  for (const role of commandRoles) {
    await safePermission(
      categories.command,
      role,
      {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      },
      `Comando → ${role.name}`
    );
  }

  /* =====================================================
     SISTEMA
  ===================================================== */

  await safePermission(
    categories.system,
    everyone,
    {
      ViewChannel: false
    },
    "Sistema → @everyone"
  );

  for (const role of staffRoles) {
    await safePermission(
      categories.system,
      role,
      {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      },
      `Sistema → ${role.name}`
    );
  }

  /* =====================================================
     TICKETS
  ===================================================== */

  await safePermission(
    categories.tickets,
    everyone,
    {
      ViewChannel: false
    },
    "Tickets → @everyone"
  );

  for (const role of staffRoles) {
    await safePermission(
      categories.tickets,
      role,
      {
        ViewChannel: true,
        ReadMessageHistory: true
      },
      `Tickets → ${role.name}`
    );
  }

  /* =====================================================
     VOZ
  ===================================================== */

  await safePermission(
    categories.voice,
    everyone,
    {
      ViewChannel: true,
      Connect: true
    },
    "Voz → todos"
  );

  console.log(
    "✅ Permissões configuradas."
  );
}

/* =========================================================
   BOAS-VINDAS
========================================================= */

async function sendWelcome(guild) {
  const channel = getTextChannel(
    guild,
    "👋・boas-vindas"
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("🍦 Bem-vindo à VANILLA")
    .setDescription(
      "Seja bem-vindo ao servidor oficial da VANILLA!\n\n" +
      "📜 Leia as regras.\n" +
      "📢 Acompanhe os comunicados.\n" +
      "🎫 Utilize o sistema de tickets quando precisar.\n\n" +
      "Bom RP!"
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
      "Clique em **Abrir Ticket** para criar um atendimento privado.\n\n" +
      "📌 Utilize para:\n" +
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

  const row = new ActionRowBuilder()
    .addComponents(button);

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
    description:
      "Configura o servidor completo da VANILLA."
  },
  {
    name: "ticket",
    description:
      "Publica o painel de tickets."
  }
];

async function registerCommands() {
  const rest = new REST({
    version: "10"
  }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      CLIENT_ID,
      GUILD_ID
    ),
    {
      body: commands
    }
  );

  console.log(
    "✅ Comandos slash registrados."
  );
}

/* =========================================================
   READY
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

client.on(
  "interactionCreate",
  async interaction => {

    /* ===================================================
       SETUP
    =================================================== */

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName ===
        "setup-vanilla"
    ) {

      const administrator =
        interaction.memberPermissions.has(
          PermissionsBitField.Flags.Administrator
        );

      const manageGuild =
        interaction.memberPermissions.has(
          PermissionsBitField.Flags.ManageGuild
        );

      if (!administrator && !manageGuild) {
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

        console.log(
          "🚀 INICIANDO SETUP VANILLA..."
        );

        await createRoles(guild);

        const categories =
          await createStructure(guild);

        await configurePermissions(
          guild,
          categories
        );

        await sendWelcome(guild);

        await interaction.editReply(
          "✅ **VANILLA CONFIGURADA COM SUCESSO!**\n\n" +
          "🎭 Cargos configurados\n" +
          "📊 Hierarquia organizada\n" +
          "📁 Categorias criadas\n" +
          "💬 Canais criados\n" +
          "🔐 Permissões configuradas\n" +
          "🎫 Sistema de tickets preparado\n" +
          "📜 Sistema de logs preparado\n" +
          "🔊 Salas de voz criadas\n\n" +
          "Use `/ticket` para publicar o painel."
        );

        console.log(
          "🎉 SETUP FINALIZADO!"
        );

      } catch (error) {

        console.error(
          "❌ ERRO NO SETUP:",
          error
        );

        await interaction.editReply(
          "⚠️ O setup encontrou um problema.\n\n" +
          "Os canais/cargos que já foram criados continuam no servidor.\n" +
          "Confira os logs do Render."
        ).catch(() => {});
      }

      return;
    }

    /* ===================================================
       COMANDO TICKET
    =================================================== */

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

      const channel =
        getTextChannel(
          interaction.guild,
          "🎫・abrir-ticket"
        );

      if (!channel) {
        return interaction.reply({
          content:
            "❌ O canal `🎫・abrir-ticket` não existe.\n" +
            "Execute `/setup-vanilla` primeiro.",
          ephemeral: true
        });
      }

      await sendTicketPanel(channel);

      return interaction.reply({
        content:
          `✅ Painel enviado em ${channel}.`,
        ephemeral: true
      });
    }

    /* ===================================================
       ABRIR TICKET
    =================================================== */

    if (
      interaction.isButton() &&
      interaction.customId ===
        "vanilla_open_ticket"
    ) {

      const guild = interaction.guild;
      const user = interaction.user;

      const category =
        getCategory(
          guild,
          CATEGORIES.TICKETS
        );

      if (!category) {
        return interaction.reply({
          content:
            "❌ A categoria de tickets não existe.\n" +
            "Execute `/setup-vanilla`.",
          ephemeral: true
        });
      }

      const existingTicket =
        guild.channels.cache.find(
          channel =>
            channel.type ===
              ChannelType.GuildText &&
            channel.parentId === category.id &&
            channel.topic ===
              `ticket:${user.id}`
        );

      if (existingTicket) {
        return interaction.reply({
          content:
            `❌ Você já possui um ticket aberto: ${existingTicket}`,
          ephemeral: true
        });
      }

      const staffRoles =
        getStaffRoles(guild);

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

      for (
        const role of staffRoles.values()
      ) {

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

      let ticketChannel;

      try {

        ticketChannel =
          await guild.channels.create({
            name:
              `ticket-${cleanName(
                user.username
              )}`,

            type: ChannelType.GuildText,

            parent: category.id,

            topic:
              `ticket:${user.id}`,

            permissionOverwrites
          });

      } catch (error) {

        console.error(
          "❌ ERRO AO CRIAR TICKET:",
          error
        );

        return interaction.reply({
          content:
            "❌ Não consegui criar o ticket.\n" +
            "Verifique se o bot possui **Gerenciar Canais**.",
          ephemeral: true
        });
      }

      /* =================================================
         EMBED
      ================================================= */

      const embed =
        new EmbedBuilder()
          .setTitle(
            "🎫 Ticket VANILLA"
          )
          .setDescription(
            `Olá ${user}!\n\n` +
            "Seu atendimento foi criado.\n\n" +
            "📝 Explique o motivo do contato.\n" +
            "👥 Aguarde a equipe.\n" +
            "🔒 Este canal é privado."
          )
          .setFooter({
            text:
              "VANILLA • Atendimento"
          });

      /* =================================================
         BOTÕES
      ================================================= */

      const claim =
        new ButtonBuilder()
          .setCustomId(
            "vanilla_claim_ticket"
          )
          .setLabel("Assumir")
          .setEmoji("👋")
          .setStyle(
            ButtonStyle.Primary
          );

      const close =
        new ButtonBuilder()
          .setCustomId(
            "vanilla_close_ticket"
          )
          .setLabel("Fechar")
          .setEmoji("🔒")
          .setStyle(
            ButtonStyle.Secondary
          );

      const deleteButton =
        new ButtonBuilder()
          .setCustomId(
            "vanilla_delete_ticket"
          )
          .setLabel("Excluir")
          .setEmoji("🗑️")
          .setStyle(
            ButtonStyle.Danger
          );

      const row =
        new ActionRowBuilder()
          .addComponents(
            claim,
            close,
            deleteButton
          );

      const mentions =
        staffRoles
          .map(
            role =>
              `<@&${role.id}>`
          )
          .join(" ");

      await ticketChannel.send({
        content:
          `${user} ${mentions}`,

        embeds: [embed],

        components: [row]
      });

      /* =================================================
         LOG
      ================================================= */

      const logs =
        getTextChannel(
          guild,
          "📜・logs"
        );

      if (logs) {
        await logs.send(
          `🎫 **TICKET ABERTO**\n` +
          `👤 Usuário: ${user}\n` +
          `📁 Canal: ${ticketChannel}`
        ).catch(() => {});
      }

      return interaction.reply({
        content:
          `✅ Seu ticket foi criado: ${ticketChannel}`,
        ephemeral: true
      });
    }

    /* ===================================================
       ASSUMIR TICKET
    =================================================== */

    if (
      interaction.isButton() &&
      interaction.customId ===
        "vanilla_claim_ticket"
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
          `👋 **Ticket assumido por ${interaction.user}.**`
      });

      const logs =
        getTextChannel(
          interaction.guild,
          "📜・logs"
        );

      if (logs) {
        await logs.send(
          `👋 ${interaction.user} assumiu ${interaction.channel}.`
        ).catch(() => {});
      }

      return;
    }

    /* ===================================================
       FECHAR TICKET
    =================================================== */

    if (
      interaction.isButton() &&
      interaction.customId ===
        "vanilla_close_ticket"
    ) {

      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content:
            "❌ Apenas a equipe pode fechar tickets.",
          ephemeral: true
        });
      }

      const topic =
        interaction.channel.topic || "";

      if (!topic.startsWith("ticket:")) {
        return interaction.reply({
          content:
            "❌ Este canal não é um ticket.",
          ephemeral: true
        });
      }

      const userId =
        topic.replace(
          "ticket:",
          ""
        );

      try {

        await interaction.channel
          .permissionOverwrites
          .edit(
            userId,
            {
              SendMessages: false
            }
          );

      } catch (error) {

        console.error(
          "⚠️ Não consegui bloquear o usuário:",
          error
        );
      }

      await interaction.reply({
        content:
          "🔒 **Ticket fechado.**\n\n" +
          "A equipe ainda pode visualizar o atendimento."
      });

      const logs =
        getTextChannel(
          interaction.guild,
          "📜・logs"
        );

      if (logs) {
        await logs.send(
          `🔒 ${interaction.user} fechou ${interaction.channel}.`
        ).catch(() => {});
      }

      return;
    }

    /* ===================================================
       EXCLUIR TICKET
    =================================================== */

    if (
      interaction.isButton() &&
      interaction.customId ===
        "vanilla_delete_ticket"
    ) {

      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content:
            "❌ Apenas a equipe pode excluir tickets.",
          ephemeral: true
        });
      }

      const channelName =
        interaction.channel.name;

      const logs =
        getTextChannel(
          interaction.guild,
          "📜・logs"
        );

      if (logs) {
        await logs.send(
          `🗑️ ${interaction.user} excluiu #${channelName}.`
        ).catch(() => {});
      }

      await interaction.reply(
        "🗑️ Ticket será excluído em 2 segundos..."
      );

      setTimeout(
        async () => {
          await interaction.channel
            .delete()
            .catch(error => {
              console.error(
                "❌ Erro ao excluir ticket:",
                error
              );
            });
        },
        2000
      );

      return;
    }
  }
);

/* =========================================================
   ERROS
========================================================= */

client.on(
  "error",
  error => {
    console.error(
      "❌ Erro do Discord:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Promise rejeitada:",
      error
    );
  }
);

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
