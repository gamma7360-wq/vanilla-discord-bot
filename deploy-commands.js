require("dotenv").config();
const {REST,Routes,SlashCommandBuilder,PermissionFlagsBits}=require("discord.js");
const commands=[
new SlashCommandBuilder().setName("setup-vanilla").setDescription("Cria/configura a estrutura VANILLA.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
new SlashCommandBuilder().setName("ticket").setDescription("Publica o painel de tickets VANILLA.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
];
const rest=new REST({version:"10"}).setToken(process.env.DISCORD_TOKEN);
(async()=>{try{console.log("Registrando comandos...");await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID,process.env.GUILD_ID),{body:commands.map(c=>c.toJSON())});console.log("✅ Comandos registrados.");}catch(e){console.error(e);process.exit(1);}})();
