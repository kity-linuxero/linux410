<a id="inicio"></a>

# Administración de servidores GNU/Linux

## Clase 18: Acceso remoto seguro

Módulo 2: Administración de Servidores

---

<a id="index"></a>

### Temas de la clase 18

- [Autenticación por ssh](#autenticacion_por_clave)
- [Copiar archivos](#copiar_archivos)
- [Hardening de sshd](#hardening_de_sshd)
- [Túneles SSH](#tuneles_ssh)
- [Actividades prácticas y laboratorios](#labs)

[Exportar a PDF](../clase18.html?print-pdf)

---

<a id="objetivos_de_la_clase"></a>

### Objetivos de la clase

Al finalizar vas a poder:

- Entrar a un servidor con una clave en lugar de la contraseña.
- Copiar archivos entre equipos por SSH.
- Aplicar hardening a sshd sin quedarte afuera.
- Llegar por un túnel SSH a un servicio que no está publicado.

---

<a id="lo_que_ya_vimos"></a>

### Lo que ya vimos

- [Clase 4](../clase4.html#/conectarse): el primer acceso por SSH, la huella del servidor y `known_hosts`.
- [Clase 9](../clase9.html#/permisos_en_un_archivo): los permisos de archivos y directorios.
- [Clase 10](../clase10.html#/administrar_un_servicio): `systemctl`, con `reload` y `restart`.
- [Clase 14](../clase14.html#/por_programa_y_por_texto): `journalctl` y los `Failed password` de SSH.
- [Clase 17](../clase17.html#/local_o_todas_las_interfaces): `ss -tlnp` y la diferencia entre `0.0.0.0` y `127.0.0.1`.

> **Nota docente:** cierra el tramo de redes. En la clase 4 entramos por SSH con contraseña y en la 17 vimos que sshd escucha en todas las interfaces. Hoy hacemos esa entrada más segura. En el laboratorio, Debian es el cliente y Rocky el servidor.

---

<a id="autenticacion_por_clave"></a>

## Autenticación por ssh

---

<a id="contrasena_o_clave"></a>

### Contraseña o clave ssh

Hasta ahora entramos con usuario y contraseña. La contraseña viaja cifrada, pero se puede adivinar probando una y otra vez (Fuerza bruta).

La autenticación por clave ssh usa un par de archivos:

- La clave pública es el candado. Se copia en los servidores.
- La clave privada es la llave. No sale de tu equipo.

Lo que se firma con la privada lo comprueba la pública, y de la pública no se puede sacar la privada.

> **Nota docente:** la comparación del candado y la llave alcanza. Si preguntan por la matemática, decir que es criptografía de clave pública y no entrar más.

---

<a id="el_par_de_claves"></a>

### El par de claves ssh

![El par de claves: en Debian quedan la clave privada ~/.ssh/id_ed25519, que no sale del equipo, y la pública ~/.ssh/id_ed25519.pub; ssh-copy-id copia la pública a ~/.ssh/authorized_keys de Rocky](img/c18/par-claves.svg)

- La privada (la llave) queda en Debian y no se copia a ningún lado.
- La pública (el candado) se copia al servidor, a `authorized_keys`.

> **Nota docente:** adelanta los nombres de archivo y `ssh-copy-id`, que se ven en detalle unas diapositivas más adelante.

---

<a id="como_se_comprueba"></a>

### Cómo se comprueba

![Cómo se comprueba la clave: 1, el cliente ofrece su clave pública; 2, el servidor la busca en authorized_keys; 3, responde que esa clave sirve; 4, el cliente firma los datos de la sesión con la privada; 5, el servidor verifica la firma y deja entrar. La privada nunca cruza la red](img/c18/comprobacion.svg)

> **Nota docente:** los pasos, para contarlos sobre la imagen: el cliente ofrece su clave pública; el servidor la busca en la lista de claves permitidas del usuario; si está, responde que esa clave sirve; el cliente firma con la privada datos que son únicos de esa sesión y manda la firma; el servidor la verifica con la pública y deja entrar. Como los datos firmados cambian en cada sesión, una firma capturada no sirve para otra. En SSH 2 no hay un «desafío» aparte: hace ese papel el identificador de la sesión, que calculan los dos extremos al cifrar el canal. Si alguien lo llama desafío, la idea es la misma. Se ve en `ssh -v`, en la diapositiva «Entrar con la clave».

---

<a id="por_que_es_mejor_que_la_contrasena"></a>

### Por qué es mejor que la contraseña

- No hay nada que adivinar por fuerza bruta.
- Si el servidor está comprometido, la contraseña se la pueden llevar. Con clave, en el servidor solo está la pública.
- En el journal desaparecen los `Failed password` que vimos en la [clase 14](../clase14.html#/por_programa_y_por_texto).

Una clave privada sin passphrase, si te la roban, abre todos los servidores donde esté la pública. Por eso la protegemos.

---

<a id="generar_el_par_de_claves"></a>

### Generar el par de claves

```text
$ ssh-keygen -t ed25519 -C "cristian@debian"
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/cristian/.ssh/id_ed25519):
Enter passphrase (empty for no passphrase):
```

[`ssh-keygen`](https://manpages.debian.org/trixie/openssh-client/ssh-keygen.1.en.html) crea el par. `-t ed25519` elige el algoritmo y `-C` agrega un comentario al final de la pública.

- `ed25519` es el algoritmo actual: claves cortas y rápidas. RSA queda para sistemas viejos.
- El comentario con usuario y equipo sirve para reconocer la clave después.

> **Nota docente:** la salida es la del inicio de `ssh-keygen`, con el nombre de archivo por defecto. En la prueba se usó `-f ~/.ssh/curso18_ed25519` y `-N` porque no había terminal. En clase se escribe la passphrase a mano. Rocky 9 exige RSA de 2048 bits o más; ed25519 no tiene ese problema.

---

<a id="los_dos_archivos"></a>

### Los dos archivos

```text
$ ls -l ~/.ssh
-rw------- 1 cristian cristian 464 nov  3 19:08 curso18_ed25519
-rw-r--r-- 1 cristian cristian  97 nov  3 19:08 curso18_ed25519.pub

$ cat ~/.ssh/curso18_ed25519.pub
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINhq6AP//WijHhpqyQ2hCipBspIXTvcIZG4B4EI5DvAD cristian@debian

$ ssh-keygen -lf ~/.ssh/curso18_ed25519.pub
256 SHA256:OkGUNvDhfDpc7Wv2VqOLSM1app1aCL3NgN7HuBDOrfc cristian@debian (ED25519)
```

- La privada es `600`, solo tuya. La pública es `644` y se puede mostrar.
- La pública es una sola línea: tipo, clave y comentario.
- `-lf` muestra la huella, para reconocer una clave sin leerla entera.

---

<a id="la_passphrase"></a>

### La passphrase

La passphrase cifra el archivo de la clave privada. Si alguien se lleva el archivo, sin la passphrase no lo puede usar.

- Se pide al generar la clave y cada vez que se usa.
- Sin la passphrase correcta, la clave no se abre.
- Sin passphrase, quien copia el archivo entra como vos.

Escribirla cada vez cansa. Para eso existe `ssh-agent`, que veremos en una diapositiva.

> **Nota docente:** en la prueba, `ssh-keygen -y` con una passphrase equivocada dio `incorrect passphrase supplied to decrypt private key`. El archivo está cifrado con `aes256-ctr` y `bcrypt`, y se lee en la cabecera en base64. Las claves sin passphrase se usan en automatizaciones; el equipo que las guarda es entonces el que hay que cuidar.

---

<a id="copiar_la_clave_al_servidor"></a>

### Copiar la clave al servidor

La clave pública tiene que quedar en el servidor, en una lista de claves permitidas. [`ssh-copy-id`](https://manpages.debian.org/trixie/openssh-client/ssh-copy-id.1.en.html) lo hace con una sola orden. La primera vez pide la contraseña.

```bash
ssh-copy-id -i ~/.ssh/curso18_ed25519.pub usuario@192.168.50.20
```

Con `-n` simula la copia y muestra qué agregaría:

```text
$ ssh-copy-id -n -i ~/.ssh/curso18_ed25519.pub usuario@192.168.50.20
...INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
Would have added the following key(s):
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINhq6AP//WijHhpqyQ2hCipBspIXTvcIZG4B4EI5DvAD cristian@debian
```

> **Nota docente:** la segunda salida es real, recortada, con `-p 2223` y `10.0.2.2` en la prueba. La copia real no se hizo con `ssh-copy-id`, porque no conocemos la contraseña de `usuario` en esa VM. En el laboratorio sí va con contraseña.

---

<a id="que_hace_ssh_copy_id_por_dentro"></a>

### Qué hace ssh-copy-id por dentro

1. Se conecta con la contraseña.
2. Crea `~/.ssh` en el servidor, con permisos `700`.
3. Agrega la línea de la clave pública a `~/.ssh/authorized_keys`, con permisos `600`.

`authorized_keys` es la lista de claves públicas que pueden entrar a esa cuenta, una por línea.

Es lo mismo que hacer a mano:

```bash
cat clave.pub >> ~/.ssh/authorized_keys
```

> **Nota docente:** en Windows no existe `ssh-copy-id`, por eso las prácticas son desde Debian. Quien quiera hacerlo desde PowerShell: `type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh usuario@servidor "cat >> ~/.ssh/authorized_keys"`. No se probó en la VM.
>
> Si preguntan por qué esos permisos: sshd ignora la clave si `~/.ssh` o `authorized_keys` se pueden escribir por otros (opción `StrictModes`, activa de fábrica; permisos en la [clase 9](../clase9.html#/permisos_en_un_archivo)). El cliente solo dice `Permission denied (publickey,...)` y la causa queda en el journal del servidor: `Authentication refused: bad ownership or modes for file /home/usuario/.ssh/authorized_keys`. Probado en Rocky con `authorized_keys` en `666`, `~/.ssh` en `777` y el directorio personal en `775`; los dos últimos dan `bad ownership or modes for directory`. Con `PasswordAuthentication yes` el cliente pasa a pedir la contraseña sin avisar, y parece que la clave no funcionó.

---

<a id="entrar_con_la_clave"></a>

### Entrar con la clave ssh

```text
$ ssh -i ~/.ssh/curso18_ed25519 usuario@192.168.50.20
Enter passphrase for key '/home/cristian/.ssh/curso18_ed25519':
[usuario@rocky ~]$
```

Pide la passphrase de la clave, no la contraseña de `usuario`.

Con `-v` se ve cómo se negocia:

```text
$ ssh -v -i ~/.ssh/curso18_ed25519 usuario@192.168.50.20 true
debug1: Offering public key: ... ED25519 SHA256:OkGUNvDhfDpc7Wv2VqOLSM1app1aCL3NgN7HuBDOrfc
debug1: Server accepts key: ... ED25519 SHA256:OkGUNvDhfDpc7Wv2VqOLSM1app1aCL3NgN7HuBDOrfc
Authenticated to 192.168.50.20 ([192.168.50.20]:22) using "publickey".
```

[`ssh`](https://manpages.debian.org/trixie/openssh-client/ssh.1.en.html) ofrece la clave, el servidor la acepta y se autentica sin contraseña.

> **Nota docente:** salida de `ssh -v` filtrada con `grep`. En la prueba la última línea decía `10.0.2.2 ([10.0.2.2]:2223)`. La clave estaba cargada en un agente de prueba; sin agente y sin terminal, `ssh` no puede pedir la passphrase y falla con `Permission denied`. Por eso la línea `Enter passphrase for key ...` de la primera salida es la que muestra `ssh` sin agente, y no sale del registro. El prompt de Rocky dice `rocky` con la red del laboratorio. La OVA no tiene nombre de equipo configurado (`hostnamectl` muestra `Static hostname: (unset)`), y el script del Lab 17 agrega `192.168.50.20 rocky` a `/etc/hosts`: con esa línea el nombre pasa a ser `rocky`. Sin ella el prompt dice `localhost` y `hostname` responde `localhost.localdomain`, como en la captura del alias y en el Lab 16.

---

<a id="un_archivo_de_configuracion_para_el_cliente"></a>

## Archivo config

Para no repetir opciones, el cliente lee `~/.ssh/config`:

```text
Host rocky
    HostName 192.168.50.20
    Port 22
    User usuario
    IdentityFile ~/.ssh/curso18_ed25519
```

```text
$ ssh rocky
[usuario@rocky ~]$
```

- `Host` es el alias que escribís después de `ssh`.
- `HostName`, `Port`, `User` e `IdentityFile` reemplazan a las opciones de la línea de comandos.
- `scp` y `sftp` usan los mismos alias.

> **Nota docente:** `Port 22` se puede omitir; se deja para mostrar dónde iría otro puerto. En la prueba el archivo decía `HostName 10.0.2.2` y `Port 2223`. El archivo va con `chmod 600 ~/.ssh/config`. No confundir con `ssh_config`, que está en `/etc/ssh/`.

---

<a id="entrar_con_el_alias"></a>

### Entrar con el alias

![Terminal del anfitrión: ssh linux410-lab-rocky entra directo a la Rocky, sin pedir contraseña, y queda el prompt [usuario@localhost ~]$](img/c18/ssh-config.png)

Con el alias en `~/.ssh/config` y la clave cargada alcanza con `ssh` y el nombre del alias. No se escribe dirección, puerto, usuario ni contraseña.

> **Nota docente:** captura del anfitrión del docente, con su alias `linux410-lab-rocky` (en clase el ejemplo es `rocky`). Ahí el prompt dice `localhost` porque esa Rocky no tiene la línea de `/etc/hosts` del laboratorio. Las tres líneas `** WARNING` las agrega el cliente OpenSSH del anfitrión (10.2) cuando la conexión no usa un intercambio de claves post-cuántico; la Rocky tiene OpenSSH 9.9. Es solo un aviso y deja entrar igual. Si preguntan: un atacante que hoy guarde el tráfico cifrado podría descifrarlo en el futuro con una computadora cuántica. Desde Debian puede no aparecer, según la versión del cliente.

---

<a id="un_comando_sin_abrir_sesion"></a>

### Un comando sin abrir sesión

Si después del destino va un comando, `ssh` lo ejecuta en el servidor, muestra la salida y vuelve. No queda una sesión abierta.

```text
$ ssh rocky uptime
 00:13:30 up 33 min,  1 user,  load average: 0,00, 0,03, 0,06
```

Sirve para consultar algo rápido, o para repetir lo mismo en varios servidores desde un script.

> **Nota docente:** salida real del 2026-11-06, desde el anfitrión con el alias `linux410-lab-rocky`. En el laboratorio se usa para crear un archivo en Rocky sin entrar.

---

<a id="la_salida_del_servidor_en_tu_equipo"></a>

### La salida del servidor, en tu equipo

La salida del comando remoto llega a tu terminal, así que se puede guardar o filtrar en tu equipo:

```text
$ ssh rocky df -h / > disco-rocky.txt
$ cat disco-rocky.txt
S.ficheros          Tamaño Usados  Disp Uso% Montado en
/dev/mapper/rl-root    19G   2,2G   17G  12% /
```

- La redirección `>` la hace tu shell: `disco-rocky.txt` queda en Debian.
- Entre comillas, todo corre en el servidor: `ssh rocky 'df -h / > disco.txt'` deja el archivo en Rocky.

> **Nota docente:** salidas reales del 2026-11-06 desde el anfitrión; Rocky está en español, por eso `S.ficheros`. Se probó también la versión con comillas: `disco.txt` quedó en el home de `usuario` en Rocky. `rpm -qa` en Rocky lista 402 paquetes y `grep openssh` deja 3. Las comillas son lo que más confunde: conviene mostrar los dos casos y preguntar dónde quedó el archivo.

---

<a id="el_agente_de_claves"></a>

### El agente de claves

`ssh-agent` es un programa que guarda en memoria las claves ya desbloqueadas.

- Se carga la clave una vez con `ssh-add` y se escribe la passphrase.
- Las conexiones siguientes ya no la piden.
- Cuando se cierra la sesión o se apaga, el agente se va con la memoria.

Hoy solo lo nombramos, sin práctica.

> **Nota docente:** la demostración está en el apunte, en «Si preguntan». Muchos escritorios lo arrancan solos. Si preguntan por `ssh -A` (reenviar el agente): cómodo pero riesgoso con servidores ajenos.

---

<a id="clave_perdida_o_filtrada"></a>

### Clave perdida o filtrada

Si se pierde la laptop o alguien copia la clave privada, esa clave sirve en todos los servidores donde esté la pública. Qué hacer:

1. Entrar por otra vía (otra clave o la consola de VirtualBox).
2. Quitar de `authorized_keys` la línea de esa clave. El comentario la identifica:

```bash
sed -i '/ cristian@debian$/d' ~/.ssh/authorized_keys
```

3. Generar una clave nueva y copiarla.
4. Revisar el journal: `Accepted publickey ... SHA256:...` muestra la huella usada.

> **Nota docente:** probado en Rocky: de dos líneas a una, y la clave dejó de entrar con `Permission denied`. Se puede borrar la línea con un editor. [`sed`](https://manpages.debian.org/trixie/sed/sed.1.en.html) es más rápido, pero un patrón mal puesto borra de más: conviene hacer una copia antes. Si la clave tenía passphrase se gana tiempo, pero no hay que apoyarse en eso.

---

<a id="una_clave_por_equipo"></a>

### Una clave por equipo

![Una clave por equipo: en authorized_keys de Rocky hay una línea por equipo; la de la notebook perdida se tacha y las del trabajo y Debian siguen entrando](img/c18/clave-por-equipo.svg)

Cada equipo genera su propio par. Si se pierde uno, se quita una sola línea y los demás siguen entrando.

> **Nota docente:** por eso el comentario de la clave lleva usuario y equipo (`cristian@notebook`): es lo que permite encontrar la línea para borrarla.

---

<a id="consultas"></a>

### Consultas

---

<a id="copiar_archivos"></a>

## Copiar archivos

---

<a id="ssh_tambien_copia_archivos"></a>

### SSH también copia archivos

Hasta ahora usamos SSH para abrir una terminal en el servidor. El mismo protocolo sirve para copiar archivos de forma segura, cifrados de punta a punta.

- Usa la misma conexión que `ssh`: el puerto 22, la misma clave o contraseña.
- Lo que viaja, el archivo y las credenciales, va cifrado.
- No hay que instalar nada en el servidor: viene con OpenSSH.

Para eso hay dos comandos: `scp`, que copia como `cp` pero entre equipos, y `sftp`, que abre una sesión para explorar y mover archivos.

> **Nota docente:** lo que vimos de autenticación por clave vale igual para copiar. Si la clave entra con `ssh`, entra con `scp` y `sftp`, y el alias de `~/.ssh/config` también sirve.

---

<a id="copiar_un_archivo"></a>

### Copiar un archivo

[`scp`](https://manpages.debian.org/trixie/openssh-client/scp.1.en.html) copia archivos por SSH, con la misma autenticación. Se escribe `scp origen destino`, y el lado remoto lleva `host:ruta`.

```bash
scp informe.txt rocky:/home/usuario/
scp rocky:desde-rocky.txt ./traido.txt
scp -r carpeta18 rocky:/home/usuario/
```

- El primer comando sube un archivo, el segundo trae uno y `-r` copia carpetas.
- Si el servidor usa otro puerto, va con `-P` en mayúscula (`scp -P 2223 ...`). En `ssh` es `-p`.
- Sobrescribe el destino sin preguntar.

> **Nota docente:** probados los tres con el alias `rocky`, y también `scp -P 2223 informe.txt usuario@10.0.2.2:/tmp/informe-p.txt`. Sin terminal `scp` no imprime nada si anda bien. Con OpenSSH 9 en adelante usa SFTP por debajo (`scp -v` muestra `command sftp`).

---

<a id="una_sesion_de_archivos"></a>

### Una sesión de archivos

[`sftp`](https://manpages.debian.org/trixie/openssh-client/sftp.1.en.html) abre una sesión para explorar el servidor y mover archivos.

```text
$ sftp rocky
sftp> pwd
Remote working directory: /home/usuario
sftp> put subir.txt
sftp> ls -l subir.txt
-rw-r--r--    ? usuario  usuario        15 Nov  3 19:10 subir.txt
sftp> get desde-rocky.txt bajado.txt
sftp> bye
```

- `put` sube y `get` baja. `ls`, `cd` y `pwd` actúan en el servidor.
- Los mismos comandos con una `l` adelante (`lls`, `lcd`, `lpwd`) actúan en tu equipo.
- `bye` cierra la sesión.

> **Nota docente:** salida real de una prueba con `sftp -b lote.sftp rocky`, que ejecuta los comandos de un archivo sin sesión interactiva. En clase se tipea a mano. En la sesión interactiva `put` muestra una línea `Uploading ...`; con `-b` no.

---

<a id="sftp_desde_el_explorador_de_archivos"></a>

### SFTP en el explorador de archivos

![Archivos de GNOME con la dirección sftp://linux410-lab-rocky/ muestra las carpetas de la raíz de Rocky, y el servidor aparece montado en la barra lateral](img/c18/sftp-nautilus.png)

El explorador de archivos también habla SFTP. En la barra de direcciones se escribe `sftp://` y el alias, y el servidor se recorre como una carpeta más: arrastrar un archivo es copiarlo.

En clientes Windows, es posible usar aplicaciones como WinSCP o FileZilla para gestionar archivos por SFTP, con la dirección, el puerto y el usuario cargados a mano.

> **Nota docente:** captura del anfitrión del docente con Archivos de GNOME (Nautilus), que usa el mismo `~/.ssh/config`: alias, usuario y clave. En Windows hacen lo mismo WinSCP o FileZilla, con la dirección, el puerto y el usuario cargados a mano.

---

<a id="hardening_de_sshd"></a>

## Hardening de sshd

---

<a id="solo_con_clave_y_sin_root"></a>

### Solo con clave y sin root

Hardening es ajustar un servicio para que deje entrar solo lo necesario. En sshd, dos opciones hacen casi todo el trabajo:

- `PermitRootLogin no`: root no entra por SSH. Se entra con un usuario común y se pasa a root con `sudo`.
- `PasswordAuthentication no`: solo entra quien tiene una clave autorizada.

La contraseña se apaga después de comprobar que la clave entra.

> **Nota docente:** valores de partida en las dos VM, con `sshd -T`: `permitrootlogin without-password` (el nombre viejo de `prohibit-password`, que ya pide clave para root), `passwordauthentication yes` y `pubkeyauthentication yes`. Si preguntan cómo limitar quién entra: `AllowUsers` y `AllowGroups`. Ojo que se acumulan entre archivos, y un `AllowUsers` olvidado en otro archivo amplía la lista sin avisar.

---

<a id="un_archivo_propio"></a>

### Un archivo propio

[`sshd_config`](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html) incluye, al principio, los `.conf` de `/etc/ssh/sshd_config.d/`. Los cambios van en un archivo nuevo ahí:

```bash
sudo tee /etc/ssh/sshd_config.d/10-curso.conf <<EOF
PermitRootLogin no
PasswordAuthentication no
EOF
```

- En sshd vale el primer valor que se lee. Por eso el nombre empieza con un número bajo: se lee antes que los demás.
- En Rocky ya hay un `50-redhat.conf`, que no toca estas opciones. En Debian el directorio está vacío.

> **Nota docente:** [`tee`](https://manpages.debian.org/trixie/coreutils/tee.1.en.html) con `sudo` escribe el archivo como root. Probado en Rocky solo con `sshd -T`: con `05-prueba.conf` (`PasswordAuthentication yes`) y `10-curso.conf` (`no`) gana `yes`; renombrado a `99-prueba.conf`, gana `no`. `50-redhat.conf` fija el registro, GSSAPI, PAM y X11. El `Include` está en la línea 15 en Rocky y en la 12 en Debian. No confundir con `ssh_config`, que es la del cliente.

---

<a id="comprobar_y_recargar"></a>

### Comprobar y recargar

```text
$ sudo sshd -t
$ sudo systemctl reload sshd
$ sudo sshd -T | grep -Ei "permitrootlogin|passwordauthentication"
permitrootlogin no
passwordauthentication no
```

- `sshd -t` revisa la sintaxis. Si está bien, no imprime nada.
- `reload` vuelve a leer la configuración sin cortar las sesiones abiertas. En Debian el servicio se llama `ssh`.
- Mientras probás, dejá una sesión abierta. Si igual te quedás afuera, la consola de VirtualBox no usa la red.

> **Nota docente:** con un error de escritura (`PermitRootLogn no`), `sshd -t` dice `Bad configuration option: PermitRootLogn` y termina con código 255. Probado: una sesión con `sleep 40` abierta antes del `reload` siguió viva, y el journal dice `Received SIGHUP; restarting.` Con `restart`, si hay un error sshd no vuelve a arrancar y nadie más puede entrar ([clase 10](../clase10.html#/administrar_un_servicio)). En un servidor real no hay consola de VirtualBox; muchos proveedores en la nube dan una consola web. La salida de `sshd -T` es la real, sin la línea de `allowusers` que tenía la prueba.

---

<a id="probar_el_resultado"></a>

### Probar el resultado

Desde la anfitriona, que no tiene la clave. Antes del hardening, sshd pide la contraseña:

```text
$ ssh -p 2223 usuario@localhost
usuario@localhost's password:
```

Después, ni la pide:

```text
$ ssh -p 2223 usuario@localhost
usuario@localhost: Permission denied (publickey,gssapi-keyex,gssapi-with-mic).
```

Entre paréntesis están las formas de entrar que acepta el servidor: `password` ya no está. Desde Debian, con la clave, `ssh rocky` entra igual que antes.

Cambiar el puerto (`Port`) solo saca el ruido de los escaneos automáticos al 22. No reemplaza a la clave, y en Rocky además hay que habilitar el puerto nuevo en SELinux y en el firewall.

> **Nota docente:** probado el 2026-11-06 en Rocky con `10-curso.conf` aplicado y deshecho después. Para simular un equipo sin la clave, desde el anfitrión del docente se usó `ssh` sin ofrecer ninguna clave (`-o IdentitiesOnly=yes`); la salida es la real. Antes del hardening, la lista del mensaje termina en `,password)` y `ssh` pide la contraseña con la línea de arriba. En el journal de Rocky el intento queda como `Connection closed by authenticating user usuario ... [preauth]`: con la contraseña apagada el servidor no la ofrece y el cliente se va sin probarla. Para el puerto, el comando de SELinux sería `semanage port -a -t ssh_port_t -p tcp 2222`; no se probó porque `semanage` no está en la OVA. Las cinco preguntas del programa aplicadas a sshd: corre como root y cada sesión pasa al usuario que entró; escucha en `0.0.0.0:22`; `~/.ssh` en `700` y `authorized_keys` en `600`; registra en el journal; quién llega lo deciden la clave, `PermitRootLogin` y, en la clase 22, el firewall.

---

<a id="consultas_2"></a>

### Consultas

---

<a id="tuneles_ssh"></a>

## Túneles SSH

---

<a id="un_servicio_que_no_se_ve_desde_afuera"></a>

## Otro servicio por ssh

Podemos tener en Rocky un servidor web, nginx, escuchando en el puerto 80. Desde Debian no llegamos: el firewall de Rocky solo deja pasar el 22.

```text
$ curl -sS -m 5 http://192.168.50.20/
curl: (7) Failed to connect to 192.168.50.20 port 80 after 1 ms: Could not connect to server
```

Al 22 sí llegamos, y SSH puede llevar otras conexiones dentro de la suya: eso se llama túnel.

Lo mismo pasa con un servicio que escucha solo en `127.0.0.1`, como vimos en la [clase 17](../clase17.html#/local_o_todas_las_interfaces): desde afuera no se ve, y por el túnel sí.

> **Nota docente:** probado desde Debian por la red interna, con nginx 1.20.1 en Rocky (`dnf install nginx`, 4 paquetes) y firewalld de fábrica. `enp0s8` queda en la zona `public`, que permite `cockpit`, `dhcpv6-client` y `ssh`, pero no `http`. El firewall rechaza la conexión (`reject with icmpx admin-prohibited`) y `curl` falla al instante; con `-v` dice `No route to host`. Debian no trae `curl`: se instala con `sudo apt install curl`, o se usa `wget -qO- URL`, que sí viene. Los firewalls se ven en la clase 22. Registros: desde Debian y desde el anfitrión.

---

<a id="el_tunel_local"></a>

### El túnel local

[`ssh -L`](https://manpages.debian.org/trixie/openssh-client/ssh.1.en.html) abre un puerto en tu equipo y lleva lo que llega ahí, por dentro de la conexión SSH, hasta una dirección que el servidor sí ve.

```bash
ssh -N -L 8080:localhost:80 rocky
```

En otra terminal de Debian:

```text
$ curl -s http://localhost:8080/ | grep -i '<title>'
<title>HTTP Server Test Page powered by: Rocky Linux</title>
```

- `-L 8080:localhost:80`: lo que llegue al 8080 de Debian sale desde Rocky hacia `localhost:80`.
- Ese `localhost` se resuelve en el servidor, o sea en Rocky.
- `-N` no abre una shell; solo mantiene el túnel. Se corta con `Ctrl+C`.

> **Nota docente:** se usa el 8080 local porque los puertos por debajo de 1024 piden root. Con el túnel, `ss -tlnp` muestra a `ssh` escuchando en `127.0.0.1:8080`. Probado desde Debian con estos mismos comandos (`ss` muestra `127.0.0.1:8080` y `[::1]:8080`); al cortar el túnel, `curl` falla con código 7.

---

<a id="recorrido_del_tunel_local"></a>

### Recorrido del túnel local

![Recorrido del túnel local: en Debian, el navegador o curl va a http://localhost:8080, el puerto local que abrió ssh -L; la conexión SSH cifrada va al puerto 22 de Rocky, el único que deja pasar el firewall; sshd la entrega a nginx en el puerto 80; sin túnel, el 80 no pasa el firewall](img/c18/tunel-local.svg)

- El navegador habla con el puerto local, sin saber del túnel.
- Entre Debian y Rocky todo viaja cifrado por SSH.
- La conexión a nginx la hace sshd desde adentro de Rocky, donde el firewall no la frena.

---

<a id="el_tunel_remoto"></a>

### El túnel remoto

[`ssh -R`](https://manpages.debian.org/trixie/openssh-client/ssh.1.en.html) hace lo contrario: abre un puerto en el servidor y lo trae hasta tu equipo. Sirve para que el servidor vea algo que corre en tu equipo.

En Debian hay una página de prueba en `127.0.0.1:8000`:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

En otra terminal de Debian, el túnel:

```bash
ssh -N -R 8000:localhost:8000 rocky
```

Y en Rocky:

```text
$ curl -s http://localhost:8000/
<h1>Hola desde mi equipo</h1>
```

> **Nota docente:** `python3 -m http.server` sirve los archivos de la carpeta donde se corre; para la prueba había un `index.html` con ese texto. En Rocky el 8000 queda en `127.0.0.1` y lo atiende `sshd-session`; por `10.0.2.15:8000` la conexión se rechaza. Es por `GatewayPorts no`, el valor de fábrica, y conviene dejarlo así. Probado desde Debian, que trae `python3` 3.13.

---

<a id="recorrido_del_tunel_remoto"></a>

### Recorrido del túnel remoto

![Recorrido del túnel remoto: en Rocky, curl va a http://localhost:8000, un puerto que abrió sshd solo en 127.0.0.1; por la conexión SSH que abrió Debian llega al cliente ssh -R, que lo entrega a la web de prueba en 127.0.0.1:8000 de Debian](img/c18/tunel-remoto.svg)

- La conexión la abre Debian, como siempre. El tráfico viaja de Rocky hacia Debian.
- El puerto 8000 de Rocky solo se ve desde la propia Rocky.
- Un uso común: mostrar en un servidor algo que todavía está en tu equipo.

---

<a id="en_el_laboratorio_cockpit"></a>

### En el laboratorio: Cockpit

Cockpit es la consola de administración web de Rocky: servicios, almacenamiento, logs y una terminal, desde el navegador, en el puerto 9090.

En el laboratorio lo dejamos escuchando solo en `127.0.0.1` y entramos desde el navegador del anfitrión con un túnel `ssh -L`, como el de nginx.

> **Nota docente:** probado el 2026-11-03 (registro de Cockpit). Se entra con usuario y contraseña del sistema, por PAM y no por sshd: el hardening no lo cambia, y eso puede generar preguntas. root está bloqueado de fábrica. El diagrama del recorrido con Cockpit quedó para el laboratorio (`imagenes/tunel-cockpit.svg`).

---

<a id="resumen"></a>

### Resumen

- La clave pública va al servidor y la privada no sale del equipo. [`ssh-keygen`](https://manpages.debian.org/trixie/openssh-client/ssh-keygen.1.en.html), [`ssh-copy-id`](https://manpages.debian.org/trixie/openssh-client/ssh-copy-id.1.en.html) y `~/.ssh/authorized_keys`.
- Si una clave se pierde, se quita su línea de `authorized_keys`.
- [`scp`](https://manpages.debian.org/trixie/openssh-client/scp.1.en.html) y [`sftp`](https://manpages.debian.org/trixie/openssh-client/sftp.1.en.html) copian archivos por SSH.
- Hardening de sshd: un archivo `10-curso.conf`, `sshd -t`, `reload` y una sesión abierta.
- [`ssh -L`](https://manpages.debian.org/trixie/openssh-client/ssh.1.en.html) lleva un puerto de tu equipo hasta un servicio que el servidor ve y vos no. `ssh -R` hace el camino inverso.

---

<a id="labs"></a>

## Actividades prácticas y laboratorios

---

<a id="labs_clase"></a>

### Actividad práctica: Laboratorio 17

- Armar la red interna de la clase 17 con el script y comprobar el `ping` entre las VM.
- Desde Debian: generar una clave, copiarla a Rocky con `ssh-copy-id` y entrar sin contraseña.
- Armar `~/.ssh/config` para entrar con `ssh rocky`.
- Copiar archivos con `scp` y ejecutar un comando en Rocky sin abrir sesión.
- Instalar Cockpit, dejarlo solo en `127.0.0.1` y entrar desde el navegador del anfitrión por un túnel `ssh -L`.
- Al final, deshacer todo.

[Laboratorio 17: Acceso remoto seguro](https://github.com/kity-linuxero/linux410-labs/blob/main/lab17/lab17.md)

> **Nota docente:** el laboratorio está escrito y probado en las VM el 2026-11-05, pero todavía no está publicado; la ruta es la prevista. Sin depender de laboratorios anteriores: solo Debian con SSH y la OVA de Rocky. El hardening se ve en la teoría y no está en el laboratorio. Cockpit trae 65 paquetes: avisar que tarda.

---

<a id="referencias"></a>

### Referencias

- Ayuda local: [`man ssh`](https://manpages.debian.org/trixie/openssh-client/ssh.1.en.html), [`man sshd_config`](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html), [`man ssh_config`](https://manpages.debian.org/trixie/openssh-client/ssh_config.5.en.html), [`man ssh-keygen`](https://manpages.debian.org/trixie/openssh-client/ssh-keygen.1.en.html), [`man scp`](https://manpages.debian.org/trixie/openssh-client/scp.1.en.html), [`man sftp`](https://manpages.debian.org/trixie/openssh-client/sftp.1.en.html).
- Cockpit: [documentación del proyecto](https://cockpit-project.org/documentation.html) y [`man cockpit-ws`](https://manpages.debian.org/trixie/cockpit-ws/cockpit-ws.8.en.html).

---

<a id="fin"></a>


