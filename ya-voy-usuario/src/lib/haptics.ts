export const hapticLight  = () => { try { navigator.vibrate?.(15) } catch {} }
export const hapticMedium = () => { try { navigator.vibrate?.(40) } catch {} }
export const hapticSuccess = () => { try { navigator.vibrate?.([10, 40, 10]) } catch {} }
export const hapticError  = () => { try { navigator.vibrate?.([30, 20, 30]) } catch {} }
