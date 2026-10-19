<a id="inicio"></a>

# Administración de servidores GNU/Linux

## Clase 14: Logs del sistema

Módulo 2 — Administración de Servidores

---

<a id="index"></a>

### Temas de la clase 14

- [Logs](#logs)
- [journalctl](#journalctl)
- [Logs de texto](#logs_de_texto)
- [Actividades prácticas y laboratorios](#labs)

[Exportar a PDF](../clase14.html?print-pdf)

---

<a id="objetivos_de_la_clase"></a>

### Objetivos de la clase

Al finalizar vas a poder:

- Filtrar el journal por servicio, por tiempo, por arranque y por prioridad.
- Ubicar los logs de texto en Debian y en Rocky.
- Explicar qué hace logrotate.
- Dejar un mensaje en el log con `logger`.
- Encontrar en los logs la causa de una falla o el rastro de un intento de acceso.

---

<a id="lo_que_ya_vimos"></a>

### Lo que ya vimos

- [Clase 4](../clase4.html#/sysvinit_systemd): syslog y el journal en la tabla de SysVinit y systemd. Y [por qué importa la hora](../clase4.html#/hora_importa).
- [Clase 6](../clase6.html#/tail): `tail -f /var/log/dpkg.log`, [`grep`](../clase6.html#/grep_basico) y [`zless`](../clase6.html#/gzip).
- [Clase 10](../clase10.html#/diagnostico_inicial): `journalctl -xeu`, `-n` y `-f` cuando un servicio falla.
- [Clase 12](../clase12.html#/df_y_du): `df` y `du`, y el disco en `/srv/datos`.

> **Nota docente:** hoy pasamos de mirar el log de un servicio a buscar en todos los logs del sistema.

---

<a id="logs"></a>

## Logs

Qué guardan y quién los escribe.

---

<a id="que_es_un_log"></a>

### ¿Qué es un log?

Un **log** (registro) es la lista de mensajes que van dejando el kernel, los servicios y los programas mientras se ejecutan.

```text
oct 18 15:26:40 lab2-vm sshd-session[999]: Failed password for ana from 10.0.2.2 port 50482 ssh2
```

| Fecha y hora | Equipo | Programa [PID] | Mensaje |
| --- | --- | --- | --- |
| `oct 18 15:26:40` | `lab2-vm` | `sshd-session[999]` | `Failed password for ana ...` |

- Sirve para encontrar la causa de una falla y para reconstruir qué pasó.
- La hora ordena los hechos: si el reloj está mal, el log pierde valor.

> **Nota docente:** línea real de la VM: un intento de entrar como `ana` con una contraseña equivocada. Por la hora cuidamos `systemd-timesyncd` en la clase 10.

---

<a id="facilidad_y_prioridad"></a>

### Facilidad y prioridad

Cada mensaje lleva dos datos que vienen de syslog, el sistema de logs clásico de Unix:

- **Facilidad:** de dónde viene. `kern`, `auth`, `authpriv`, `daemon`, `cron`, `mail`, `user`, `local0` a `local7`.
- **Prioridad:** qué tan grave es.

| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `emerg` | `alert` | `crit` | `err` | `warning` | `notice` | `info` | `debug` |

Número más bajo, más grave.

> **Nota docente:** no hace falta memorizarlas. La prioridad la elige el programa: en la VM, un `Failed password` de SSH es `info`.

---

<a id="journald_y_rsyslog"></a>

### journald y rsyslog

|  | journald | rsyslog |
| --- | --- | --- |
| Qué es | El servicio de logs de systemd | El servicio syslog actual |
| Guarda en | Archivos binarios, con índices | Archivos de texto en `/var/log` |
| Se lee con | `journalctl` | `less`, `tail`, `grep` |
| Debian 13 | Sí, en disco | No viene instalado |
| Rocky 9 | Sí, en memoria | Sí |

journald recibe todos los mensajes. Si está instalado, rsyslog los copia a archivos de texto.

> **Nota docente:** journald guarda en disco si existe `/var/log/journal` (Debian lo crea al instalar, Rocky no). En Rocky el journal se pierde al reiniciar y el historial queda en los archivos de rsyslog. Debian dejó de instalar rsyslog en la versión 12. Cada entrada del journal tiene muchos campos además del mensaje: se ven con `journalctl -o verbose`.

---

<a id="journalctl"></a>

## journalctl

Buscar en el journal.

---

<a id="lo_que_ya_usamos"></a>

### Lo que ya usamos

```bash
sudo journalctl -u ssh -n 20    # últimas 20 líneas
sudo journalctl -u ssh -f       # en vivo; Ctrl+C sale
sudo journalctl -xeu ssh        # lo que sugiere systemd
```

| Opción | Qué hace |
| --- | --- |
| `-u ssh` | Solo los mensajes del servicio `ssh` |
| `-e` | Abre el log en el final, donde están los mensajes más nuevos |
| `-x` | Agrega una explicación debajo de algunos mensajes de systemd |

Sin `sudo`, solo se ven los mensajes propios. Los grupos `adm` y `systemd-journal` leen todo sin `sudo`.

> **Nota docente:** repaso de la [clase 10](../clase10.html#/diagnostico_inicial). Sin `-e`, `journalctl` abre el log desde el mensaje más viejo y hay que bajar hasta el final. Las líneas que agrega `-x` empiezan con `░░` y no son del log: por ejemplo, debajo de `Failed to start demo-falla.service` aparecen `░░ Subject: A start job for unit demo-falla.service has failed` y una explicación que repite lo mismo con más palabras. Para los mensajes de los programas no agrega nada, así que para buscar alcanza con `-u` y `-e`. `-xeu` aparece porque es lo que recomienda `systemctl` cuando un servicio falla. Sumar un operador a `adm` ([clase 8](../clase8.html#/grupo_principal_y_suplementarios)) le da lectura de los logs sin darle `sudo`.

---

<a id="por_tiempo_y_por_arranque"></a>

### Por tiempo y por arranque

```bash
sudo journalctl --since "10 min ago"
sudo journalctl --since "2026-10-18 15:27" --until "2026-10-18 15:28"
```

```bash
sudo journalctl -b          # desde el último encendido
sudo journalctl -b -1 -e    # final del encendido anterior
```

> **Nota docente:** el caso típico: «el servidor se reinició solo anoche». `-b -1 -e` muestra qué pasó justo antes de apagarse. En Rocky no funciona porque el journal se borra al reiniciar: hay que mirar `/var/log/messages`.

---

<a id="por_prioridad"></a>

### Por prioridad

```text
$ sudo journalctl -b -p err
oct 18 15:17:35 lab2-vm systemd-ssh-generator[224]: Failed to query local AF_VSOCK CID
oct 18 15:17:36 lab2-vm kernel: vmwgfx ...: [drm] *ERROR* ... unsupported hypervisor.
```

- `-p err`: `err` y todo lo más grave. También rangos: `-p warning..err`.
- Algunos errores salen en cada arranque y no indican ninguna falla.

> **Nota docente:** salida real con los mensajes recortados. Son avisos de VirtualBox. Conviene conocer los errores que cada equipo muestra siempre, para no perder tiempo con ellos cuando se busca una falla real.

---

<a id="por_programa_y_por_texto"></a>

### Por programa y por texto

```bash
sudo journalctl -u ssh                # por unidad
sudo journalctl -t sshd-session       # por etiqueta
sudo journalctl -k                    # solo el núcleo
sudo journalctl -u ssh --grep "Failed password"
```

El nombre de la unidad tiene que ser el exacto:

```text
$ sudo journalctl -u sshd --since 15:26
-- No entries --
```

> **Nota docente:** en Debian la unidad es `ssh` y `sshd` es un alias. `systemctl` acepta el alias; `journalctl` no. En Rocky la unidad es `sshd`. `--no-pager` permite encadenar con `grep` ([clase 6](../clase6.html#/tuberias)).

---

<a id="el_journal_ocupa_disco"></a>

### El journal ocupa disco

```text
$ sudo journalctl --disk-usage
Archived and active journals take up 176.9M in the file system.
```

- Se limita solo: hasta el 10 % del sistema de archivos (`SystemMaxUse=` en `/etc/systemd/journald.conf`).
- Para liberar espacio: `sudo journalctl --vacuum-size=100M`.

> **Nota docente:** `--vacuum` se usa cuando la raíz se llena y el journal es parte del problema. Nunca borrar archivos del journal con `rm`.

---

<a id="consultas"></a>

### Consultas



---

<a id="logs_de_texto"></a>

## Logs de texto

rsyslog y `/var/log`.

---

<a id="donde_mirar"></a>

### Dónde mirar

|  | Debian 13 | Debian con rsyslog | Rocky 9 |
| --- | --- | --- | --- |
| Todo menos accesos | `journalctl` | `/var/log/syslog` | `/var/log/messages` |
| Accesos | `journalctl -u ssh` | `/var/log/auth.log` | `/var/log/secure` |
| Núcleo | `journalctl -k` | `/var/log/kern.log` y `syslog` | `/var/log/messages` |

```bash
sudo apt install rsyslog
```

Otros: `/var/log/apt/history.log` ([clase 11](../clase11.html#/instalar_y_quitar)), `/var/log/dnf.log` en Rocky.

> **Nota docente:** el journal tiene todo. En los archivos, los accesos van aparte, en `auth.log` o `secure`, y no están en `syslog` ni en `messages`. Los mensajes del núcleo sí están en `syslog`, y `kern.log` es una copia aparte solo con ellos. `messages`, en Rocky, guarda desde `info` y deja afuera también el correo y cron. En el Lab 13.1 se instala rsyslog, que copia desde que se instala: lo anterior queda solo en el journal. Los archivos quedan `root:adm` con modo `0640`.

---

<a id="una_linea_de_texto"></a>

### Una línea de texto

Debian 13:

```text
2026-10-18T15:27:50.890849-03:00 lab2-vm sshd-session[1307]: Failed password for ana from 10.0.2.2 port 56382 ssh2
```

Rocky 9:

```text
Oct 18 15:27:15 localhost sshd-session[2033]: Failed password for invalid user ana from 10.0.2.2 port 34668 ssh2
```

Las mismas partes: fecha, equipo, programa [PID] y mensaje.

> **Nota docente:** Debian usa fecha completa con zona horaria; Rocky, el formato clásico sin año. En Rocky `ana` no existe, por eso dice `invalid user`.

---

<a id="las_reglas_de_rsyslog"></a>

### Las reglas de rsyslog

`/etc/rsyslog.conf` en Debian:

```text
*.*;auth,authpriv.none		-/var/log/syslog
auth,authpriv.*			/var/log/auth.log
kern.*				-/var/log/kern.log
*.emerg				:omusrmsg:*
```

- Cada regla: `facilidad.prioridad` y destino.
- `syslog` recibe todo menos los accesos, que van a `auth.log`.

> **Nota docente:** solo se leen. El `-` delante del archivo indica que no se fuerza la escritura a disco en cada línea. `*.emerg` muestra las emergencias en la terminal de todos. Rocky: `authpriv.*` va a `/var/log/secure`.

---

<a id="logs_en_otro_equipo"></a>

### Logs en otro equipo

- rsyslog puede enviar los logs por la red y también recibirlos.
- Si alguien entra con root, puede borrar los logs locales, pero no los que ya salieron.
- Los logs de varios servidores se revisan en un solo lugar.

> **Nota docente:** solo se nombra. En el Lab 13.2 la VM Rocky recibe los logs de la Debian. Herramientas como Graylog o Loki centralizan y buscan logs de muchos equipos: fuera del curso.

---

<a id="quien_entro_last"></a>

### Quién entró: last

```text
$ last -n 3
cristian pts/0        10.0.2.2         Sun Oct 18 15:26 - 15:27  (00:00)
reboot   system boot  6.12.105+deb13-a Sun Oct 18 15:17 - still running
reboot   system boot  6.12.105+deb13-a Mon Oct  5 01:10 - crash
```

- Sesiones interactivas y arranques. `crash`: no hubo apagado ordenado.
- En Rocky también están `lastb` (intentos fallidos) y `lastlog`.

> **Nota docente:** en Debian 13 `last` viene del paquete `wtmpdb`, y `lastb` y `lastlog` no existen: los intentos fallidos se buscan en el journal. Los `crash` son de cerrar VirtualBox sin apagar la VM ([clase 10](../clase10.html#/apagar_la_vm_no_es_lo_mismo)).

---

<a id="rotacion_con_logrotate"></a>

### Rotación con logrotate

Un log de texto crece sin límite. logrotate renombra el actual, crea uno vacío, comprime los viejos y borra los que sobran.

```text
syslog          ← el actual
syslog.1        ← la semana pasada
syslog.2.gz
syslog.3.gz
syslog.4.gz     ← en la próxima rotación se borra
```

- Configuración: `/etc/logrotate.conf` y `/etc/logrotate.d/`.
- Lo dispara `logrotate.timer` una vez por día.
- Probar sin tocar nada: `sudo logrotate -d /etc/logrotate.d/rsyslog`.

> **Nota docente:** la configuración de rsyslog en Debian: `rotate 4`, `weekly`, `compress`, `delaycompress` (deja el `.1` sin comprimir), `missingok`, `notifempty`. Rocky agrega `dateext`: `messages-20261012` en vez de `messages.1`. Los `.gz` se leen con `zless` ([clase 6](../clase6.html#/gzip)). journald no usa logrotate: rota solo. Los temporizadores, en la clase 16.

---

<a id="logger_escribir_en_el_log"></a>

### logger: escribir en el log

```bash
logger -t respaldo -p user.err "No se pudo copiar /srv/datos"
```

```text
$ journalctl -t respaldo
oct 18 15:27:52 lab2-vm respaldo[1339]: No se pudo copiar /srv/datos
```

- `-t`: etiqueta. `-p`: facilidad y prioridad.
- Con rsyslog, también queda en `/var/log/syslog`.

> **Nota docente:** sirve para que un script deje rastro. Lo usamos en la clase 15. Cualquier usuario puede escribir con cualquier etiqueta: un mensaje en el log no prueba quién lo escribió.

---

<a id="consultas_2"></a>

### Consultas



---

<a id="resumen"></a>

### Resumen

- journald guarda todo y se lee con `journalctl`: `-u`, `-t`, `-b`, `--since`, `-p`, `--grep`.
- rsyslog copia a texto: `syslog` y `auth.log` en Debian, `messages` y `secure` en Rocky. También puede mandar los logs a otro equipo.
- logrotate rota, comprime y borra los logs de texto.
- `logger` escribe en el log desde un script.

---

<a id="labs"></a>

## Actividades prácticas y laboratorios



---

<a id="labs_clase"></a>

### Actividad práctica — Laboratorios 13.1 y 13.2

**Objetivo:** investigar dos incidentes con los logs y juntar los logs de las dos VM.

- 13.1: recorrer el journal, instalar rsyslog en la Debian e investigar dos incidentes.
- 13.2: la VM Rocky recibe los logs de la Debian.

[Laboratorio 13.1 — Logs del sistema](https://github.com/kity-linuxero/linux410-labs/blob/main/lab13/lab13.1.md)

[Laboratorio 13.2 — Logs en otro equipo](https://github.com/kity-linuxero/linux410-labs/blob/main/lab13/lab13.2.md)

> **Nota docente:** los dos laboratorios están escritos y probados en las VM (2026-10-18), sin publicar todavía. Ninguno depende de laboratorios anteriores, salvo el acceso por SSH del Lab 3: el 13.1 usa un tmpfs de 20 MB para el disco lleno y `root` como cuenta existente, y el 13.2 instala rsyslog en la Debian. El 13.2 necesita la VM Rocky (se descarga la OVA si falta) y una regla de reenvío de puertos en la VM Rocky, porque las dos VM están en NAT y no se ven entre sí: la Debian envía a `10.0.2.2:2514` (el anfitrión) y VirtualBox lo pasa al puerto 514 de Rocky.

---

<a id="referencias"></a>

### Referencias

- Ayuda local: `man journalctl`, `man journald.conf`, `man rsyslog.conf`, `man logrotate`, `man logger`, `man last`.
- [journalctl(1)](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html).
- [Documentación de rsyslog](https://www.rsyslog.com/doc/).
- [Debian 12: rsyslog ya no se instala por defecto](https://www.debian.org/releases/bookworm/amd64/release-notes/ch-information.en.html#changes-to-system-logging).
