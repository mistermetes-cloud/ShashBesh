# ShashBesh — reglas v1

DRAFT_REVIEW_REQUIRED. Traducción para revisión, sin verificación independiente por hablantes nativos. Fuente: docs/RULES_V1.md y aprobación GAME UPDATE 06. Las demás cuestiones siguen abiertas.

## Juego y tablero

De 2 a 4 jugadores, cinco fichas cada uno. Gana quien primero llena las cinco posiciones de su casa en una cadena contigua. El recorrido exterior cerrado tiene 48 casillas, 1→2→…→48→1, y se avanza en orden creciente. Salidas: P1=1, P2=13, P3=25, P4=37. Cada casa incluye la salida exterior compartida y cuatro casillas interiores: para P1, 1, Д1.2, Д1.3, Д1.4, Д1.5; igual para los demás. Hay 48 exteriores + 16 interiores = 64 casillas físicas únicas. Esquinas: 7, 19, 31, 43. El CSV define la geometría exacta.

## Inicio y turnos

Cada jugador tira un d6. Empieza el mayor; si hay empate, solo los líderes empatados repiten hasta quedar uno. Después se juega en sentido horario. Los demás esperan a que el jugador activo termine toda su serie de tiradas extra.

## Tiradas y acciones

Se tiran dos dados independientes de seis caras. Una tirada a–b da dos acciones separadas de a y b. El orden y reparto entre fichas están sujetos a la prioridad de los saltos legales de esquina; capturar es opcional y después puede usarse cualquier ficha legal. Cualquier doble n–n da cuatro acciones n y otra tirada: 6–6 son cuatro seises, no dos ni tres. 6–5 o 5–6 («shashbesh») da acciones seis y cinco y otra tirada. No hay límite de tiradas extra. Cada tirada se resuelve y registra completamente antes de la siguiente; no se mezclan ni trasladan acciones entre tiradas.

Debe usarse la suma máxima posible de valores entre secuencias completas permitidas por las prioridades de esquina. Si puede usarse 6+3=9, no se permite mover seis de modo que impida usar tres. Si solo puede usarse uno entre cinco y tres, se usa cinco. A igual suma máxima hay libertad estratégica.

## Entrada, movimiento y captura

Una ficha de reserva entra en su salida con una acción de seis, sin avanzar seis casillas. Si hay una ficha propia, no puede entrar; si hay una rival, la captura. Solo una ficha por casilla física. No se puede pasar, saltar ni caer sobre fichas propias; sí pasar rivales. Caer exactamente sobre una rival obliga a capturarla: vuelve a la reserva y su progreso se reinicia. Elegir una captura es opcional; se puede elegir otra acción legal. No añadir parejas, bloqueos, pilas ni casillas exteriores seguras no especificadas.

## Saltos de esquina — prioridad confirmada por el propietario

Ciclo: 31→43→7→19→31. Un salto legal tiene prioridad absoluta sobre captura, otra ficha y orden de dados. Se verifican secuencias completas antes de elegir estrategia. Llegar a una esquina consume una acción normal. El salto requiere un uno sin usar y lo consume como acción separada. Ejemplo desde 40 con 3–1: 40→41→42→43 consume tres; 43→44→45→46→47→48→1→2→3→4→5→6→7 consume uno. Ese uno no puede usarse en otra acción; el salto no es gratuito.

Una ficha que ya está en una esquina debe saltar si un uno sin usar permite un salto legal. Sin uno, llegar a la esquina no crea prioridad. El progreso exterior aumenta por la aproximación y doce por el salto; se consumen los valores nominales de las acciones. Las fichas propias bloquean tanto la aproximación como las doce casillas del salto. Las rivales intermedias permanecen; solo se captura la del destino. Un salto bloqueado por fichas propias no genera obligación; se verifican las acciones normales según las reglas establecidas.

Se conservan todas las alternativas de esquina legales que cumplen las obligaciones y la suma máxima. Una captura no elimina otra alternativa de esquina. Después del salto se elige cualquier acción legal con los valores restantes, incluso con otra ficha. Con 1–2, primero se salta con 1 y después se elige la acción con 2; el 2 nunca se consume automáticamente. Si ninguna tiene acción legal, se mantiene el cierre existente de tirada no jugable. Sigue vigente la política provisional `jumpEntry: skip` al cruzar la entrada por salto; las preguntas anteriores no quedan automáticamente resueltas.

## Casa y victoria

Tras completar el circuito exterior, al llegar a la entrada propia se entra en casa; no se permite iniciar otra vuelta voluntariamente (los saltos obligatorios pueden causar otra vuelta). Las cuatro casillas interiores están protegidas: los rivales no entran ni capturan allí. Puede haber varias fichas propias todavía móviles, pero no pueden pasarse ni compartir casilla. Con A en Д1.3, B puede entrar en Д1.2, sin saltar A.

Se exige el valor exacto: no se rebasa la última casilla ni el final. Un valor excesivo no sirve para esa ficha, pero puede usarse con otra. Las fichas permanecen en casa y quedan fijas para siempre formando una cadena desde el fondo: Д1.5, Д1.4, Д1.3, Д1.2 y finalmente la salida exterior compartida (1, 13, 25 o 37) tras completar una vuelta. Las móviles pueden entrar antes de que las anteriores queden fijas. Llenar las cinco posiciones da la victoria. Ejemplo con 1–1, A en Д1.3 y B en Д1.2, sin salto obligatorio: A→Д1.4; B→Д1.3; A→Д1.5; B→Д1.4 es legal.

## Aplazado / excluido

No se modelan dados que caen de la mesa. Elegir capturar es opcional; caer sobre una rival la captura automáticamente. No se presuponen apuestas ni blockchain: la cadena de hashes es una función técnica local.
