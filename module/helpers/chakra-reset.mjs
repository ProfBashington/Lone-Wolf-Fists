export async function chakraReset(actor) {
    const maxAura = actor.system?.aura?.max;
    const minChakra = actor.system?.chakras?.lvl;
    const basePranaGen = actor.system?.pool?.lvl * minChakra;
    if(!(maxAura === undefined || minChakra === undefined))
        return actor.update({ ["system.aura.value"]: maxAura, [ 'system.prana.value']: basePranaGen, [ 'system.chakras.value' ]: minChakra })
}
