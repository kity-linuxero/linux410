<a id="inicio"></a>

# Administración de servidores GNU/Linux

## Clase 15: Shell scripting para administración

Módulo 2 — Administración de Servidores

---

<a id="index"></a>

### Temas de la clase 15

- [Scripts](#scripts)
- [Variables y argumentos](#variables_y_argumentos)
- [if condicional](#decidir)
- [Código de salida y errores](#codigo_de_salida_y_errores)
- [Repetir y elegir](#repetir_y_elegir)
- [Revisar scripts](#antes_de_confiar)
- [Actividades prácticas y laboratorios](#labs)

[Exportar a PDF](../clase15.html?print-pdf)

---

<a id="objetivos_de_la_clase"></a>

### Objetivos de la clase

Al finalizar vas a poder:

- Escribir un script y ejecutarlo.
- Usar variables y recibir un argumento.
- Revisar si un comando salió bien y avisar si no.
- Repetir una tarea sobre una lista.
- Escribir un script que falle de forma previsible.

---

<a id="lo_que_ya_vimos"></a>

### Lo que ya vimos

- [Clase 6](../clase6.html#/comillas): comillas, [tuberías](../clase6.html#/tuberias) y comodines.
- [Clase 7](../clase7.html#/nano_abrir): `nano` y las redirecciones [`>`](../clase7.html#/redireccion_crear) y [`>>`](../clase7.html#/redireccion_agregar).
- [Clase 9](../clase9.html#/chmod_forma_simbolica): `chmod +x`.
- [Clase 14](../clase14.html#/logger_escribir_en_el_log): `logger` para dejar un mensaje en el log.

> **Nota docente:** todo lo de hoy se arma con comandos que ya conocen. Lo nuevo es ponerlos en un archivo.

---

<a id="scripts"></a>

## Scripts

Los mismos comandos, guardados en un archivo.

---

<a id="que_es_un_script"></a>

### ¿Qué es un script?

Un **script** es un archivo de texto con comandos, uno debajo del otro. La shell los ejecuta en orden, como si los escribiéramos nosotros.

Conviene escribir uno cuando una tarea:

- se repite;
- tiene varios pasos y no queremos olvidar ninguno;
- va a correr sin nadie mirando (clase 16).

> **Nota docente:** insistir en que son los comandos de siempre, guardados en un archivo.

---

<a id="el_primer_script"></a>

### El primer script

```bash
nano estado.sh
```

```bash
#!/bin/bash
# Estado del equipo

df -h /
free -h
uptime
```

- `#!/bin/bash`: qué programa lee el archivo. Va en la primera línea. A esta línea se le llama "shebang".
- `#`: comentario. La shell lo saltea.
- El resto son comandos que se ejecutan en orden.

> **Nota docente:** en Debian `/bin/sh` es `dash`, otra shell más chica. Por eso pedimos `bash` de forma explícita.

---

<a id="ejecutarlo"></a>

### Ejecutarlo

```text
$ bash estado.sh
S.ficheros     Tamaño Usados  Disp Uso% Montado en
/dev/sda2         19G   1,6G   17G   9% /
...

$ ./estado.sh
-bash: ./estado.sh: Permiso denegado

$ chmod +x estado.sh

$ ./estado.sh
S.ficheros     Tamaño Usados  Disp Uso% Montado en
...
```

- Con `bash` delante no hace falta permiso de ejecución.
- Para ejecutarlo por su nombre, `chmod +x`.

---

<a id="por_que"></a>

### ¿Por qué `./`?

```text
$ estado.sh
-bash: estado.sh: orden no encontrada
```

- Un nombre sin ruta se busca solo en los directorios de `PATH`.
- El directorio actual no está en `PATH`. `./` dice «el que está acá».
- Los scripts del administrador van en `/usr/local/sbin`, con dueño `root` y modo `755`.
- Con el siguiente comando podemos ver el valor de `PATH`: y donde están los comandos.

```text
echo $PATH
```

> **Nota docente:** si otra cuenta puede editar un script que corre como `root`, puede hacer que `root` ejecute lo que quiera. Enlace a [errores frecuentes](../clase5.html#/errores1) de la clase 5.

---

<a id="variables_y_argumentos"></a>

## Variables y argumentos



---

<a id="que_es_una_variable"></a>

### ¿Qué es una variable?

Una **variable** es un nombre que guarda un valor. Es como una etiqueta pegada a una caja: escribimos el nombre y la shell usa lo que hay adentro.

```text
$ NOMBRE=Ana
$ echo "Hola $NOMBRE"
Hola Ana
```

- Se asigna **sin espacios** alrededor del `=`.
- Se lee con `$` adelante.

```text
$ NOMBRE = Ana
-bash: NOMBRE: orden no encontrada
```

> **Nota docente:** el error de los espacios es el más común del primer día: con espacios, la shell toma `NOMBRE` como un comando.

---

<a id="variables"></a>

### Variables en un script

```bash
#!/bin/bash
# Copia los registros de apt

ORIGEN=/var/log/apt
DESTINO=/srv/respaldos

cp -r "$ORIGEN" "$DESTINO"
echo "Copié $ORIGEN en $DESTINO"
```

- Por convención van en mayúsculas, como las que ya existen: `$USER`, `$HOME`, `$PATH`.
- En un script conviene usarlas siempre:
  - el valor se escribe una sola vez, arriba y a la vista;
  - si cambia, se corrige una sola línea;
  - el nombre dice qué es: `DESTINO` se entiende mejor que la ruta;
  - no hay que repetir rutas largas, que es donde aparecen los errores de tipeo.

---

<a id="comillas_dobles"></a>

### Comillas dobles

```text
$ NOMBRE="informe final"
$ touch $NOMBRE
$ ls
estado.sh  final  informe
$ rm final informe
$ touch "$NOMBRE"
$ ls
 estado.sh  'informe final'
```

Sin comillas, la shell corta el valor en los espacios. Regla: **toda variable va entre comillas dobles**.

> **Nota docente:** las simples no reemplazan la variable ([clase 6](../clase6.html#/comillas)). Por eso, dobles.

---

<a id="guardar_la_salida_de_un_comando"></a>

### Guardar la salida de un comando

```text
$ FECHA=$(date +%F)
$ echo "copia-$FECHA"
copia-2026-10-20
```

`$(comando)` se reemplaza por lo que el comando muestra.

> **Nota docente:** ya lo usaron en la clase 11 con [`dpkg -S $(which tree)`](../clase11.html#/consultas_con_dpkg). El formato año-mes-día ordena bien los archivos.

---

<a id="que_es_un_argumento"></a>

### ¿Qué es un argumento?

Un **argumento** es lo que escribimos después del nombre de un comando para decirle con qué trabajar.

```text
ls -l /etc
./archivar.sh /srv/respaldos
```

- En `ls -l /etc`, `-l` es una opción y `/etc` es el argumento: el directorio que queremos ver.
- Un script también recibe argumentos. Así el mismo script sirve para distintos directorios.

> **Nota docente:** opciones y argumentos ya se vieron en la [clase 5](../clase5.html#/opciones_argumentos). Acá lo nuevo es que nuestro script también los puede recibir.

---

<a id="argumentos"></a>

### Argumentos

```bash
#!/bin/bash
echo "Este script se llama $0"
echo "Recibió: $1"
```

```text
$ ./args.sh /srv/respaldos
Este script se llama ./args.sh
Recibió: /srv/respaldos
$ ./args.sh
Este script se llama ./args.sh
Recibió: 
```

- `$0` es el nombre del script.
- `$1` es lo que va después del nombre. `$2`, el segundo.
- Si no se pasa nada, `$1` queda vacío y el script sigue igual.

> **Nota docente:** `read` pide un dato por teclado. No lo usamos: un script que corre solo no tiene a quién preguntarle.

---

<a id="un_valor_por_defecto"></a>

### Un valor por defecto

Si no se pasa el argumento, el script puede usar un valor elegido de antemano:

```bash
#!/bin/bash
DESTINO=${1:-/srv/respaldos}
echo "Copio en $DESTINO"
```

```text
$ ./destino.sh
Copio en /srv/respaldos
$ ./destino.sh /tmp
Copio en /tmp
```

- `${1:-/srv/respaldos}` se lee: «`$1`, y si está vacío, `/srv/respaldos`».

> **Nota docente:** sirve para la clase 16, cuando cron llame al script sin argumentos. Si el argumento es algo que se va a borrar o modificar, es más seguro no tener valor por defecto y salir pidiéndolo.

---

<a id="consultas"></a>

### Consultas



---

<a id="decidir"></a>

## if condicional



---

<a id="if"></a>

### `if`

```bash
#!/bin/bash
if [ -d "$1" ]; then
    echo "$1 es un directorio"
else
    echo "$1 no es un directorio"
fi
```

```text
$ ./esdir.sh /etc
/etc es un directorio
$ ./esdir.sh /noexiste
/noexiste no es un directorio
```

- Espacios dentro de los corchetes: `[-d` da `orden no encontrada`.
- `fi` cierra el `if`. `else` es opcional.

---

<a id="pruebas"></a>

### Condiciones

| Condición | Se cumple si |
| --- | --- |
| `[ "$1" = "estado" ]` | el texto es igual a `estado` |
| `[ -z "$1" ]` | el texto está vacío |
| `[ -d "$1" ]` | es un directorio |
| `[ -f "$1" ]` | es un archivo |
| `[ ! -d "$1" ]` | **no** es un directorio |
| `[ "$N" -eq 0 ]` | el número es igual a 0 |
| `[ "$N" -ne 0 ]` | el número es distinto de 0 |

---

<a id="codigo_de_salida_y_errores"></a>

## Código de salida y errores



---

<a id="codigo_de_salida"></a>

### Código de salida

Cuando un comando termina deja dos cosas: lo que muestra en pantalla y un número que no se ve, el **código de salida**. **0** quiere decir que salió bien; otro valor indica un problema.

```text
$ ls /etc/hostname; echo $?
/etc/hostname
0
$ ls /noexiste; echo $?
ls: no se puede acceder a '/noexiste': No existe el fichero o el directorio
2
```

- `$?` es el código del último comando. Se mira inmediatamente después.

> **Nota docente:** cada programa decide su número. `grep` devuelve 1 cuando no encuentra nada, y no es una falla.

---

<a id="usarlo_en_un_script"></a>

### Usarlo en un script

```bash
cp -r /var/log/apt "$DESTINO/apt-$FECHA"

if [ $? -ne 0 ]; then
    echo "No se pudo copiar"
    exit 1
fi
```

- Entre el comando y el `if` no va ninguna otra línea.
- `exit 0` o `exit 1` dicen si el script funcionó, a quien lo llame.

> **Nota docente:** `sudo apt update && sudo apt upgrade` del Lab 3: `&&` ejecuta el segundo solo si el primero salió con 0. `||`, solo si falló. Los nombramos sin usarlos.

---

<a id="repaso_redirecciones"></a>

### Repaso: `>` y `>>`

En la [clase 7](../clase7.html#/redireccion_crear) mandamos la salida de un comando a un archivo en lugar de la pantalla.

```text
$ echo "primera" > notas.txt
$ echo "segunda" >> notas.txt
$ cat notas.txt
primera
segunda
$ echo "otra" > notas.txt
$ cat notas.txt
otra
```

| Símbolo | Qué hace |
| --- | --- |
| `>` | Crea el archivo o reemplaza lo que tenía |
| `>>` | Crea el archivo o agrega al final |

> **Nota docente:** repaso de [`>`](../clase7.html#/redireccion_crear) y [`>>`](../clase7.html#/redireccion_agregar). Hace falta para la diapositiva siguiente: `>` solo captura la salida normal.

---

<a id="dos_salidas"></a>

### Dos salidas

Lo que un comando muestra sale por dos caminos: la **salida normal** (el resultado) y la **salida de error** (los mensajes de error). En la pantalla se ven juntas.

```text
$ ls /etc/hostname /noexiste > salida.txt
ls: no se puede acceder a '/noexiste': No existe el fichero o el directorio
$ cat salida.txt
/etc/hostname
$ ls /etc/hostname /noexiste 2> errores.txt
/etc/hostname
```

- `>` guarda la salida normal. Los errores van por otro canal.
- `2>` guarda los errores.

---

<a id="dev_null"></a>

### `/dev/null`

`/dev/null` es un archivo especial del sistema que descarta todo lo que se le escribe. Funciona como un tacho de basura sin fondo.

```text
$ find /etc -name "*.conf" | wc -l
find: ‘/etc/credstore’: Permiso denegado
find: ‘/etc/ssl/private’: Permiso denegado
find: ‘/etc/credstore.encrypted’: Permiso denegado
58
$ find /etc -name "*.conf" 2> /dev/null | wc -l
58
```

Lo que se manda ahí no lo ve nadie, aunque sea un error importante.

---

<a id="mensajes_de_error_en_el_script"></a>

### Mensajes de error en el script

```bash
echo "No existe el directorio $DESTINO" >&2
logger -t archivar -p user.err "Falló el archivado en $DESTINO"
```

- `>&2` manda el mensaje por el canal de error.
- `logger` deja rastro en el log aunque nadie mire la pantalla.

```text
$ sudo journalctl -t archivar
oct 20 23:47:37 lab2-vm archivar[914]: Falló el archivado en /srv/respaldos
```

---

<a id="consultas_2"></a>

### Consultas



---

<a id="repetir_y_elegir"></a>

## Repetir y elegir



---

<a id="for"></a>

### `for`

`for` repite los mismos comandos una vez por cada elemento de una lista. A esto se le llama **iterar**: en cada vuelta, la variable toma el valor siguiente.

```text
$ for u in ana bruno carla; do echo "Usuario: $u"; done
Usuario: ana
Usuario: bruno
Usuario: carla
```

```bash
for f in /var/log/*.log; do
    ls -lh "$f"
done
```

```text
-rw-r--r-- 1 root root 0 oct  5 00:44 /var/log/alternatives.log
-rw-r--r-- 1 root root 35K oct 18 23:40 /var/log/dpkg.log
```

La lista puede ser de palabras o de archivos, con un comodín.

---

<a id="case"></a>

### `case`

`case` compara un valor con varias opciones y ejecuta solo el bloque de la que coincide.

```bash
#!/bin/bash
case "$1" in
    estado)
        systemctl is-active ssh
        ;;
    espacio)
        df -h /
        ;;
    *)
        echo "Uso: $0 estado|espacio" >&2
        exit 1
        ;;
esac
```

- El script anterior hace que si le llega como argumento "estado", muestre el estado del servicio ssh y si llega "espacio", muestre el uso del espacio en disco.
- Una opción por cada valor del argumento. `*` atrapa el resto.

> **Nota docente:** los scripts de `/etc/init.d` tienen esta forma, con `start` y `stop` ([clase 4](../clase4.html#/sysvinit_systemd)). Funciones: mencionarlas con el ejemplo de `error()` del apunte, sin practicar.

---

<a id="ejemplo_revisar_servicios"></a>

### Ejemplo: revisar servicios

```bash
#!/bin/bash
# Muestra el estado de varios servicios

for s in ssh cron systemd-timesyncd apache2; do
    echo "$s: $(systemctl is-active $s)"
done
```

```text
$ ./servicios.sh
ssh: active
cron: active
systemd-timesyncd: active
apache2: inactive
```

Una sola orden para revisar todo lo que nos importa ([clase 10](../clase10.html#/diagnostico_inicial)).

> **Nota docente:** `apache2` no está instalado en la VM y aun así responde `inactive`. Otro ejemplo del mismo tipo: crear varias cuentas con `for u in ana bruno carla; do sudo useradd -m "$u"; done` (clase 8).

---

<a id="ejemplo_copiar_configuraciones"></a>

### Ejemplo: copiar configuraciones

```bash
#!/bin/bash
# Copia archivos de /etc antes de modificarlos

DESTINO=/srv/respaldos
FECHA=$(date +%F)

for f in hosts fstab hostname; do
    cp "/etc/$f" "$DESTINO/$f-$FECHA"
done

ls "$DESTINO"
```

```text
$ sudo ./copiar-config.sh
fstab-2026-10-26
hostname-2026-10-26
hosts-2026-10-26
```

Antes de tocar una configuración, una copia con la fecha.

---

<a id="antes_de_confiar"></a>

## Revisar scripts



---

<a id="revisar_un_script"></a>

### Revisar un script

```text
$ bash -n roto.sh
roto.sh: línea 4: error sintáctico: no se esperaba el final del fichero
$ bash -x esdir.sh /etc
+ '[' -d /etc ']'
+ echo '/etc es un directorio'
/etc es un directorio
```

- `bash -n` revisa la sintaxis sin ejecutar.
- `bash -x` muestra cada línea con las variables ya reemplazadas.
- Probar también los casos que fallan: sin argumento, ruta que no existe, sin permisos.

---

<a id="una_variable_vacia"></a>

### Una variable vacía

```text
$ DIR=""
$ echo rm -rf "$DIR"/*
rm -rf /bin /boot /dev /etc /home ... /usr /var
```

- Con `DIR` vacío, `"$DIR"/*` es `/*`.
- Antes de borrar, mostrar con `echo` qué se borraría.
- Revisar con `[ -z ... ]` que la variable tenga algo.

> **Nota docente:** se muestra con `echo` adelante. Nunca ejecutarlo sin el `echo`.

---

<a id="un_script_que_te_da_una_ia"></a>

### Un script que te da una IA

Antes de ejecutarlo, leerlo y responder:

- ¿Qué toca? Buscar `rm`, `>`, `sudo`, `chmod`, `systemctl`.
- ¿Las variables van entre comillas? ¿Qué pasa si una queda vacía?
- ¿Revisa los argumentos? ¿Avisa si algo falla?
- ¿Lo probé primero en un lugar sin riesgo, con `bash -n` o `bash -x`?

No ejecutar con `sudo` un script que no leímos, ni un `curl ... | bash`. No pegar en un chat de IA contraseñas, claves ni configuraciones internas.

> **Nota docente:** hoy casi nadie escribe un script largo sin ayuda. La clase da lo necesario para entender lo que propone la IA y darse cuenta si algo está mal. `shellcheck` hace parte de esta revisión de forma automática (paso opcional del lab).

---

<a id="lo_que_vas_a_ver_en_scripts_ajenos"></a>

### Lo que vas a ver en scripts ajenos

| Escrito así | Quiere decir |
| --- | --- |
| `set -euo pipefail` | cortar el script ante el primer error |
| `${1:-valor}` | `$1`, o `valor` si está vacío |
| `if ! comando; then` | si el comando falló |
| `[[ ... ]]` | como `[ ... ]`, propio de Bash |
| `nombre() { ... }` | una función: un bloque con nombre que se llama varias veces |

> **Nota docente:** solo para reconocerlos, no para practicarlos. `set -euo pipefail`: `-e` corta ante el primer comando que falla, `-u` trata como error una variable que no existe y `pipefail` hace que una tubería falle si falla cualquiera de sus comandos. Probado en la VM: con `ls /noexiste` el script termina ahí, con código 2.

---

<a id="consultas_3"></a>

### Consultas



---

<a id="resumen"></a>

### Resumen

- Un script son comandos guardados, con `#!/bin/bash` arriba y `chmod +x`.
- Variables sin espacios en el `=` y siempre entre comillas dobles.
- `$1` es el argumento; revisarlo antes de usarlo o darle un valor por defecto.
- `if [ ... ]` decide; `$?` dice si el último comando salió bien.
- `>&2` y `logger` para avisar; `exit 1` cuando algo falla.
- `for` para repetir y `case` para elegir.

---

<a id="labs"></a>

## Actividades prácticas y laboratorios



---

<a id="labs_clase"></a>

### Actividad práctica — Laboratorio 14

**Objetivo:** escribir un script que copie los registros de apt, avise si falla y deje rastro en el log.

- Primer script: estado del equipo.
- `archivar.sh`, armado de a un paso: argumento, `if`, `$?`, mensajes de error y `logger`.
- Probarlo con los casos que fallan: sin argumento, sin `sudo` y con el disco lleno.

[Laboratorio 14 — Scripts de administración](https://github.com/kity-linuxero/linux410-labs/blob/main/lab14/lab14.md)

> **Nota docente:** el Laboratorio 14 está escrito y probado en la VM (2026-10-26). No depende de laboratorios anteriores, salvo el acceso por SSH del Lab 3: usa un `tmpfs` de 5 MB en `/srv/respaldos` para el disco lleno. `shellcheck` y el script de servicios son opcionales.

---

<a id="referencias"></a>

### Referencias

- Ayuda local: `man bash`, `help if`, `help for`, `help case`, `man logger`.
- [Manual de Bash (GNU)](https://www.gnu.org/software/bash/manual/).
- [ShellCheck](https://www.shellcheck.net/).
