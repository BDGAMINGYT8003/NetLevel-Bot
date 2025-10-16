module.exports = {
    marketItems: [
        { id: 'twi_permit', name: 'Twilight Echo Permit x1', cost: 50, stock: 15, levelReq: 1 },
        { id: 'wep_permit', name: 'Weapon Echo Permit x1', cost: 50, stock: 15, levelReq: 1 },
        { id: 'adv_permit', name: 'Advanced Echo Permit x1', cost: 50, stock: 15, levelReq: 1 },
        { id: 'pur_metal', name: 'Purifier Metal x100', cost: 30, stock: 20, levelReq: 1 },
        { id: 'ion_probe', name: 'Ion Probes x200', cost: 40, stock: 20, levelReq: 1 },
        { id: 'exp_10k', name: 'Stellaris EXP x10000', cost: 35, stock: 20, levelReq: 1 },
        { id: 'map_permit', name: 'Starmap Echo Permit x1', cost: 85, stock: 10, levelReq: 1 },
        { id: 'star_ticket', name: 'Starsea Ticket x1', cost: 100, stock: 10, levelReq: 1 },
        { id: 'dia_box', name: 'Diamond Blind Box x1', cost: 100, stock: 15, levelReq: 1 },
        { id: 'red_eqpt', name: 'Red 2-Star Eqpt. Selection x1', cost: 100, stock: 10, levelReq: 1 },
        { id: 'ssr_box', name: 'SSR+ Stellaris Selection Box x1', cost: 400, stock: 2, levelReq: 11 },
        { id: 'lotto_ticket', name: 'Lottery Ticket', cost: 150, stock: Infinity, levelReq: 21 },
    ],
    leveling: {
        baseXp: 100,
        xpMultiplier: 0.5,
        ciBase: 1,
        ciMultiplier: 0.5,
    },
    dailyCiCap: 70,
};