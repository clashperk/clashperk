const { Command } = require('discord-akairo');
const fetch = require('node-fetch');
class UnitsCommand extends Command {
    constructor() {
        super('units', {
            aliases: ['units', 'troops'],
            category: 'clashofclans',
            description: {
                content: 'Get a player\'s troops information ',
            },
            args: [
                {
                    id: 'tag',
                    match: 'content',
                    type: 'string',
                    prompt: {
                        start: 'Which player would you like to search for ?',
                        retry: "That's not a valid clan tag! Try again."
                    }
                }
            ]
        });
    }

    async exec(message, { tag }) {
        const troopsemoji = {
            'Barbarian': '<:barbarian:698893174499835924>',
            'Archer': '<:archer:698893149552115737>',
            'Goblin': '<:goblin:698893177200836608>',
            'Giant': '<:giant:698893176735268924>',
            'Wall Breaker': '<:wallbreaker:698893177087721512>',
            'Balloon': '<:ballooncoc:698893178585219192>',
            'Wizard': '<:wizard:698893174864740475>',
            'Healer': '<:healer:698893177461014618>',
            'Dragon': '<:dragon:698893175590486076>',
            'P.E.K.K.A': '<:pekka:698893176592793661>',
            'Minion': '<:minion:698893177058492477>',
            'Hog Rider': '<:hogrider:698893175602937896>',
            'Valkyrie': '<:valkyrie:698893178375241728>',
            'Golem': '<:golem:698893177695764520>',
            'Witch': '<:witch:698893177993560115>',
            'Lava Hound': '<:lavahound:698893178144817193>',
            'Bowler': '<:bowler:698893174718070847>',
            'Baby Dragon': '<:babydragon:698893152400048233>',
            'Miner': '<:miner:698893176152391732>',
            'Electro Dragon': '<:electrodragon:698893177687638107>',
            'Ice Golem': '<:icegolem:699162779130789928>',
            'Yeti': '<:yeti:699162779717730314>',
            'Super Barbarian': '<:elitebarbarian:699162793441624104>',
            'Super Giant': '<:elitegiant:699162800727130162>',
            'Sneaky Goblin': '<:sneakygoblin:699162802421497866>',
            'Super Wall Breaker': '<:elitewallbreaker:699162803755548712>',

            'Stone Slammer': '<:siegebowlerballoon:699162786617491528>',
            'Siege Barracks': '<:siegemachinecarrier:699162787703816262>',
            'Battle Blimp': '<:battleblimp:698893179423817819>',
            'Wall Wrecker': '<:wallwrecker:698893177557614593>',

            'Raged Barbarian': '<:ragedbarbarian:698893174097182760>',
            'Sneaky Archer': '<:sneakyarcher:698893176152391692>',
            'Beta Minion': '<:betaminion:698893176420958218>',
            'Boxer Giant': '<:boxergiant:698893177570066477>',
            'Bomber': '<:bomber:698893174550298695>',
            'Super P.E.K.K.A': '<:superpekka:698893177767067678>',
            'Cannon Cart': '<:cannoncart:698893173753118720>',
            'Drop Ship': '<:dropship:698893178329366558>',
            'Night Witch': '<:nightwitch:698893176248729752>',
            'Hog Glider': '<:hogglider:699165674500784210>',
        }
        const spellsemoji = {
            'Clone Spell': '<:clone_:524921180910518272>',
            'Earthquake Spell': '<:earthquake_:524921182659674122>',
            'Haste Spell': '<:haste_:524921185549418506>',
            'Freeze Spell': '<:freeze_:524921189290999818>',
            'Healing Spell': '<:healing_:524921190834503723>',
            'Jump Spell': '<:jump_:524921194437279745>',
            'Lightning Spell': '<:lightning_:524921197369229342>',
            'Poison Spell': '<:poison_:524921198312816641>',
            'Rage Spell': '<:ragec_:524921200900833280>',
            'Skeleton Spell': '<:skeletonc_:524921203975127049>',
            'Bat Spell': '<:Bat_Spell_info_:524937829122441227>',
        }

        const heroesemoji = {
            'Archer Queen': '<:archerqueen_:524921268408156202>',
            'Barbarian King': '<:barbarianking_:524921271792828416>',
            'Battle Machine': '<:warmachine_:524921274334707762>',
            'Grand Warden': '<:grandwarden_:524921276775661608>',
            'Royal Champion': '<:royalchampion:653967122166185995>'
        }

        const res = await fetch(`https://clash.clashperk.xyz/v1/players/%23${tag.toUpperCase().replace(/#/g, '')}`);
        const data = await res.json();

        let troopLevels = ''
        let count = 0

        data.troops.filter(a => !['Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks'].includes(a.name)).forEach(troop => {
            if (troop.village === 'home') {

                count++
                troopLevels += `${troopsemoji[troop.name]}\`\u200e${troop.level.toString().padStart(2, ' ')}/${troop.maxLevel.toString().padStart(2, ' ')}\` `
                if (count > 0 && count % 4 === 0) {
                    if (troop.level === troop.maxLevel) {
                        troopLevels += '\n'
                    } else {
                        troopLevels += '\n'
                    }
                } else {
                    if (troop.level === troop.maxLevel) {
                        troopLevels += '\u2002'
                    } else {
                        troopLevels += '\u2002'
                    }
                }
            }
        })
        const embed = this.client.util.embed()
            .setColor(0x5970c1)
            .setThumbnail('https://coc.guide/static/imgs/other/town-hall-' + data.townHallLevel + '.png')
            .setAuthor(data.name + '\u200e ' + data.tag, (data.league) ? data.league.iconUrls.small : null)
        if (troopLevels)
            embed.setDescription(`Troop Levels\n${troopLevels.slice(0, troopLevels.length - 2)}`)
        ///////////////////////////////////////////
        let machineLevels = ''
        count = 0
        data.troops.forEach(troop => {
            if (troop.village === 'home') {
                if (troop.name == 'Wall Wrecker' || troop.name == 'Battle Blimp' || troop.name == 'Stone Slammer' || troop.name == 'Siege Barracks') {
                    count++
                    machineLevels += `${troopsemoji[troop.name]}\`\u200e${troop.level.toString().padStart(2, ' ')}/${troop.maxLevel.toString().padStart(2, ' ')}\``
                    if (count > 0 && count % 4 === 0) {
                        if (troop.level === troop.maxLevel) {
                            machineLevels += '\n'
                        } else {
                            machineLevels += '\n'
                        }
                    } else {
                        if (troop.level === troop.maxLevel) {
                            machineLevels += '\u2002'
                        } else {
                            machineLevels += '\u2002'
                        }
                    }
                }
            }
        })
        if (machineLevels)
            embed.addField(`Siege Machine Levels`, `\n${machineLevels.slice(0, machineLevels.length - 2)}`)
        ///////////////////////////////////////////
        let troopLevels2 = ''
        let count2 = 0
        data.troops.forEach(troop => {
            if (troop.village === 'builderBase') {
                count2++
                troopLevels2 += `${troopsemoji[troop.name]}\`\u200e${troop.level.toString().padStart(2, ' ')}/${troop.maxLevel.toString().padStart(2, ' ')}\``
                if (count2 > 0 && count2 % 4 === 0) {
                    if (troop.level === troop.maxLevel) {
                        troopLevels2 += '\n'
                    } else {
                        troopLevels2 += '\n'
                    }
                } else {
                    if (troop.level === troop.maxLevel) {
                        troopLevels2 += '\u2002'
                    } else {
                        troopLevels2 += '\u2002'
                    }
                }
            }
        })
        if (troopLevels2) embed.addField('Builder Troop Levels', troopLevels2.slice(0, troopLevels2.length - 2))
        ///////////////////////////////
        let spellLevels = ''
        count = 0
        data.spells.forEach(spell => {
            if (spell.village === 'home') {
                count++
                spellLevels += `${spellsemoji[spell.name]}\`\u200e${spell.level.toString().padStart(2, ' ')}/${spell.maxLevel.toString().padStart(2, ' ')}\``
                if (count > 0 && count % 4 === 0) {
                    if (spell.level === spell.maxLevel) {
                        spellLevels += '\n'
                    } else {
                        spellLevels += '\n'
                    }
                } else {
                    if (spell.level === spell.maxLevel) {
                        spellLevels += '\u2002'
                    } else {
                        spellLevels += '\u2002'
                    }
                }
            }
        })
        if (spellLevels) embed.addField('Spell Levels', spellLevels.slice(0, spellLevels.length - 2))
        //////////////////////////////
        let heroLevels = ''
        count = 0
        data.heroes.forEach(hero => {
            count++
            heroLevels += `${heroesemoji[hero.name]}\`\u200e${hero.level.toString().padStart(2, ' ')}/${hero.maxLevel.toString().padStart(2, ' ')}\``
            if (count > 0 && count % 4 === 0) {
                if (hero.level === hero.maxLevel) {
                    heroLevels += '\n'
                } else {
                    heroLevels += '\n'
                }
            } else {
                if (hero.level === hero.maxLevel) {
                    heroLevels += '\u2002'
                } else {
                    heroLevels += '\u2002'
                }
            }
        })
        if (heroLevels) embed.addField('Hero Levels', heroLevels.slice(0, heroLevels.length - 2))
        return message.channel.send(embed);
    }
}


module.exports = UnitsCommand;