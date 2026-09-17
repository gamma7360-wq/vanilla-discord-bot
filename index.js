require("dotenv").config();
const http = require("http");
const {Client,GatewayIntentBits,PermissionFlagsBits,ChannelType,ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,REST,Routes,SlashCommandBuilder}=require("discord.js");
const client=new Client({intents:[GatewayIntentBits.Guilds]});

const ROLE_DEFS=[
["👑・FUNDADOR",PermissionFlagsBits.Administrator,0xD4AF37],
["💎・DONO",PermissionFlagsBits.Administrator,0xC0C0C0],
["⚜️・LÍDER",PermissionFlagsBits.ManageGuild|PermissionFlagsBits.ManageChannels|PermissionFlagsBits.ManageRoles|PermissionFlagsBits.ManageMessages,0xFFD700],
["🔱・SUB-LÍDER",PermissionFlagsBits.ManageChannels|PermissionFlagsBits.ManageRoles|PermissionFlagsBits.ManageMessages,0xE5E4E2],
["🎖️・GERENTE",PermissionFlagsBits.ManageMessages|PermissionFlagsBits.ManageThreads,0xA7A7A7],
["🔥・ELITE",0,0xB8860B],["🛡️・MEMBRO",0,0x808080],["🔰・RECRUTA",0,0xA9A9A9],["📝・CANDIDATO",0,0x696969],
["🛠️・ADMINISTRADOR",PermissionFlagsBits.Administrator,0xFF5555],
["🔨・MODERADOR",PermissionFlagsBits.ManageMessages|PermissionFlagsBits.KickMembers|PermissionFlagsBits.BanMembers,0x55AAFF],
["🎫・RECRUTADOR",PermissionFlagsBits.ManageMessages,0xAA55FF],["🤖・BOT",0,0x5865F2]
];

const STRUCTURE=[
["📌・INFORMAÇÕES","public",["👋・boas-vindas","📜・regras","📢・comunicados","📖・história-da-vanilla","👑・hierarquia","📋・códigos-internos","📅・agenda"]],
["📝・RECRUTAMENTO","recruitment",["📥・como-entrar","📝・formulário","🎫・entrevista","📂・candidatos","⏳・em-análise","✅・aprovados","❌・reprovados"]],
["👥・MEMBROS","members",["💬・chat-geral","📸・mídia","🎮・momentos-rp","😂・resenha","📊・metas","🏆・conquistas","📣・avisos-internos"]],
["🔒・ÁREA INTERNA","internal",["💬・chat-interno","📡・comunicação","📍・operações-rp","🚘・veículos","📦・inventário","📋・relatórios","💰・controle-financeiro"]],
["👑・COMANDO","command",["👑・sala-do-líder","💎・conselho","📋・reuniões","📊・relatório-geral","⚠️・advertências","📈・promoções","📁・documentos"]],
["🎫・SUPORTE","support",["🎫・abrir-ticket","📨・tickets","❓・dúvidas","📢・denúncias-internas"]],
["🤖・SISTEMA","system",["🤖・comandos","📜・logs","🔔・notificações","📊・registro-de-atividades"]]
];
const VOICE=["🔊・sala-geral","🎮・resenha","📡・comunicação-rp","🚘・equipe-rp","👑・sala-do-comando","💤・ausente"];

const findRole=(g,n)=>g.roles.cache.find(r=>r.name===n);
async function role(g,[name,permissions,color]){
 let r=findRole(g,name);
 if(!r)r=await g.roles.create({name,permissions,color,reason:"VANILLA 2.0"});
 else await r.edit({permissions,color,reason:"VANILLA 2.0"}).catch(()=>{});
 return r;
}
function overwrites(g,type,roles){
 const E=g.roles.everyone.id;
 const visible={
 public:Object.keys(roles),
 recruitment:["📝・CANDIDATO","🔰・RECRUTA","🛡️・MEMBRO","🎫・RECRUTADOR","🔨・MODERADOR","🎖️・GERENTE","🔱・SUB-LÍDER","⚜️・LÍDER","💎・DONO","👑・FUNDADOR","🛠️・ADMINISTRADOR","🤖・BOT"],
 members:["🔰・RECRUTA","🛡️・MEMBRO","🔥・ELITE","🎖️・GERENTE","🔱・SUB-LÍDER","⚜️・LÍDER","💎・DONO","👑・FUNDADOR","🛠️・ADMINISTRADOR","🔨・MODERADOR","🎫・RECRUTADOR","🤖・BOT"],
 internal:["🛡️・MEMBRO","🔥・ELITE","🎖️・GERENTE","🔱・SUB-LÍDER","⚜️・LÍDER","💎・DONO","👑・FUNDADOR","🛠️・ADMINISTRADOR","🔨・MODERADOR","🤖・BOT"],
 command:["🔱・SUB-LÍDER","⚜️・LÍDER","💎・DONO","👑・FUNDADOR","🛠️・ADMINISTRADOR","🤖・BOT"],
 support:["📝・CANDIDATO","🔰・RECRUTA","🛡️・MEMBRO","🔥・ELITE","🎖️・GERENTE","🔱・SUB-LÍDER","⚜️・LÍDER","💎・DONO","👑・FUNDADOR","🛠️・ADMINISTRADOR","🔨・MODERADOR","🎫・RECRUTADOR","🤖・BOT"],
 system:["🎫・RECRUTADOR","🔨・MODERADOR","🔱・SUB-LÍDER","⚜️・LÍDER","💎・DONO","👑・FUNDADOR","🛠️・ADMINISTRADOR","🤖・BOT"]
 }[type]||[];
 const send=[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.SendMessages];
 const read=[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory];
 return [{id:E,deny:[PermissionFlagsBits.ViewChannel]},...visible.map(n=>roles[n]).filter(Boolean).map(r=>({id:r.id,allow:type==="public"?read:send}))];
}
async function category(g,name,type,roles,pos){
 let c=g.channels.cache.find(x=>x.type===ChannelType.GuildCategory&&x.name===name);
 const ow=overwrites(g,type,roles);
 if(!c)c=await g.channels.create({name,type:ChannelType.GuildCategory,permissionOverwrites:ow,reason:"VANILLA 2.0"});
 else await c.permissionOverwrites.set(ow,"VANILLA 2.0").catch(()=>{});
 await c.setPosition(pos).catch(()=>{});return c;
}
async function text(g,p,n){
 let c=g.channels.cache.find(x=>x.type===ChannelType.GuildText&&x.name===n&&x.parentId===p.id);
 if(!c)c=await g.channels.create({name:n,type:ChannelType.GuildText,parent:p.id,reason:"VANILLA 2.0"});return c;
}
async function voice(g,p,n){
 let c=g.channels.cache.find(x=>x.type===ChannelType.GuildVoice&&x.name===n&&x.parentId===p.id);
 if(!c)c=await g.channels.create({name:n,type:ChannelType.GuildVoice,parent:p.id,reason:"VANILLA 2.0"});return c;
}
async function setup(g){
 const roles={};for(const d of ROLE_DEFS)roles[d[0]]=await role(g,d);
 for(let i=0;i<STRUCTURE.length;i++){const [n,t,ch]=STRUCTURE[i];const c=await category(g,n,t,roles,i);for(const x of ch)await text(g,c,x);}
 let vc=g.channels.cache.find(x=>x.type===ChannelType.GuildCategory&&x.name==="🔊・SALAS DE VOZ");
 if(!vc)vc=await g.channels.create({name:"🔊・SALAS DE VOZ",type:ChannelType.GuildCategory,reason:"VANILLA 2.0"});
 await vc.setPosition(STRUCTURE.length).catch(()=>{});
 for(const n of VOICE)await voice(g,vc,n);
 const w=g.channels.cache.find(x=>x.type===ChannelType.GuildText&&x.name==="👋・boas-vindas");
 if(w){const ms=await w.messages.fetch({limit:20}).catch(()=>null);if(!ms?.some(m=>m.author.id===client.user.id&&m.content.includes("BEM-VINDO À VANILLA")))await w.send("🍦 | **BEM-VINDO À VANILLA**\n\nSeja bem-vindo(a) à nossa família.\n\nAntes de começar, leia as regras e conheça nossa estrutura.\n\n**LEALDADE • RESPEITO • UNIÃO**");}
}
function staff(g){return["🎫・RECRUTADOR","🔨・MODERADOR","🎖️・GERENTE","🔱・SUB-LÍDER","⚜️・LÍDER","💎・DONO","👑・FUNDADOR","🛠️・ADMINISTRADOR"].map(n=>findRole(g,n)).filter(Boolean);}
async function openTicket(i){
 const g=i.guild;
 const old=g.channels.cache.find(c=>c.type===ChannelType.GuildText&&c.topic===`ticket:${i.user.id}`);
 if(old)return i.reply({content:`❌ Você já possui um ticket: ${old}`,ephemeral:true});
 let cat=g.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&c.name==="🎫・TICKETS");
 if(!cat)cat=await g.channels.create({name:"🎫・TICKETS",type:ChannelType.GuildCategory,reason:"VANILLA tickets"});
 const staffRoles=staff(g);
 const ow=[{id:g.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},{id:i.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},...staffRoles.map(r=>({id:r.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}))];
 const clean=i.user.username.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,18)||"usuario";
 const c=await g.channels.create({name:`ticket-${clean}`,type:ChannelType.GuildText,parent:cat.id,topic:`ticket:${i.user.id}`,permissionOverwrites:ow,reason:`Ticket VANILLA: ${i.user.tag}`});
 const row=new ActionRowBuilder().addComponents(
 new ButtonBuilder().setCustomId("ticket_claim").setLabel("Assumir Ticket").setStyle(ButtonStyle.Primary),
 new ButtonBuilder().setCustomId("ticket_close").setLabel("Fechar Ticket").setStyle(ButtonStyle.Danger));
 const e=new EmbedBuilder().setTitle("🍦 | TICKET VANILLA").setDescription(`Olá, ${i.user}!\n\nDescreva seu assunto abaixo. Um membro da equipe irá atender você.`).setFooter({text:"VANILLA • Suporte"});
 await c.send({embeds:[e],components:[row]});await i.reply({content:`✅ Ticket criado: ${c}`,ephemeral:true});
 const log=g.channels.cache.find(c=>c.type===ChannelType.GuildText&&c.name==="📜・logs");if(log)await log.send(`🎫 Ticket aberto: ${c} por **${i.user.tag}**`).catch(()=>{});
}
client.once("ready",async()=>{
 console.log(`🍦 VANILLA BOT 2.1 online: ${client.user.tag}`);
 try{
  const commands=[
   new SlashCommandBuilder().setName("setup-vanilla").setDescription("Cria/configura a estrutura VANILLA.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
   new SlashCommandBuilder().setName("ticket").setDescription("Publica o painel de tickets VANILLA.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  ];
  const rest=new REST({version:"10"}).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID,process.env.GUILD_ID),{body:commands.map(c=>c.toJSON())});
  console.log("✅ Comandos slash registrados.");
 }catch(e){console.error("❌ Erro ao registrar comandos:",e.message);}
});
client.on("interactionCreate",async i=>{
 try{
  if(i.isChatInputCommand()){
   if(i.commandName==="setup-vanilla"){
    if(!i.memberPermissions?.has(PermissionFlagsBits.Administrator)&&!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild))return i.reply({content:"❌ Você precisa de Administrador ou Gerenciar Servidor.",ephemeral:true});
    await i.deferReply({ephemeral:true});await setup(i.guild);return i.editReply("🍦 **VANILLA 2.0 configurada com sucesso!**");
   }
   if(i.commandName==="ticket"){
    if(!i.memberPermissions?.has(PermissionFlagsBits.Administrator)&&!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild))return i.reply({content:"❌ Apenas a equipe administrativa pode publicar o painel.",ephemeral:true});
    const e=new EmbedBuilder().setTitle("🍦 | SUPORTE VANILLA").setDescription("Precisa de ajuda?\n\nClique em **Abrir Ticket** para criar um atendimento privado.");
    const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_open").setLabel("Abrir Ticket").setEmoji("🎫").setStyle(ButtonStyle.Success));
    await i.channel.send({embeds:[e],components:[row]});return i.reply({content:"✅ Painel enviado.",ephemeral:true});
   }
  }
  if(i.isButton()){
   if(i.customId==="ticket_open")return openTicket(i);
   const sr=staff(i.guild);
   const isStaff=sr.some(r=>i.member.roles.cache.has(r.id))||i.memberPermissions?.has(PermissionFlagsBits.Administrator);
   if(i.customId==="ticket_claim"){if(!isStaff)return i.reply({content:"❌ Você não pode assumir tickets.",ephemeral:true});return i.reply(`🎫 **Ticket assumido por ${i.user}.**`);}
   if(i.customId==="ticket_close"){
    const owner=i.channel.topic?.startsWith("ticket:")?i.channel.topic.split(":")[1]:null;
    if(!isStaff&&i.user.id!==owner)return i.reply({content:"❌ Você não pode fechar este ticket.",ephemeral:true});
    const log=i.guild.channels.cache.find(c=>c.type===ChannelType.GuildText&&c.name==="📜・logs");if(log)await log.send(`🔒 Ticket fechado: \`${i.channel.name}\` por **${i.user.tag}**`).catch(()=>{});
    await i.reply("🔒 Ticket sendo fechado...");setTimeout(()=>i.channel.delete("Ticket fechado"),1500);
   }
  }
 }catch(e){console.error(e);if(i.deferred||i.replied)i.followUp({content:"❌ Ocorreu um erro.",ephemeral:true}).catch(()=>{});else i.reply({content:"❌ Ocorreu um erro.",ephemeral:true}).catch(()=>{});}
});
const PORT=process.env.PORT||3000;
http.createServer((req,res)=>{
 res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8"});
 res.end("VANILLA Discord Bot online");
}).listen(PORT,"0.0.0.0",()=>console.log(`🌐 HTTP ativo na porta ${PORT}`));

client.login(process.env.DISCORD_TOKEN);
