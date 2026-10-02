<a id="inicio"></a>

# Administración de servidores GNU/Linux

## Clase 11: Paquetes y software

Módulo 1 — Operación de Sistemas Operativos GNU/Linux

---

<a id="index"></a>

### Temas de la clase 11

- [Paquetes](#paquetes)
- [APT](#apt)
- [dpkg](#dpkg)
- [Repositorios](#repositorios)
- [Otras distribuciones](#otras_distribuciones)
- [Seguridad al instalar software](#seguridad_al_instalar_software)
- [Actividad práctica — Laboratorio 10](#labs_clase)

[Exportar a PDF](../clase11.html?print-pdf)

---

<a id="objetivos_de_la_clase"></a>

### Objetivos de la clase

Al finalizar vas a poder:

- Instalar, actualizar y quitar software con APT.
- Averiguar qué instaló un paquete y de qué paquete viene un archivo.
- Leer de dónde descarga Debian el software y por qué confía en él.
- Reconocer cómo se hace lo mismo con `dnf` en Rocky Linux.

---

<a id="retomamos_el_laboratorio_9"></a>

### Retomamos el Laboratorio 9

```bash
sudo apt update
sudo apt install htop psmisc
```

- ¿Qué hizo cada comando?
- ¿De dónde salieron `htop` y `psmisc`?
- ¿Por qué el sistema confió en lo que bajó?

> **Nota docente:** en el Lab 9 solo dijimos que `apt` instala programas desde los repositorios de Debian. Hoy se contestan estas tres preguntas. Instalar necesita `sudo` porque cambia archivos de `/usr` y `/etc`, que son de root (clases 8 y 9).

---

<a id="paquetes"></a>

## Paquetes

Qué se instala y quién lo instala.

---

<a id="que_trae_un_paquete_deb"></a>

### Qué trae un paquete .deb

| Contenido | Ejemplo |
| --- | --- |
| Archivos del programa | `/usr/bin/htop`, páginas de manual |
| Configuración | archivos en `/etc` |
| Metadatos | versión, descripción, dependencias |
| Scripts | se ejecutan al instalar y al quitar |

El sistema lleva la cuenta de todo lo que instaló cada paquete. Por eso en un servidor no se instala un programa bajado suelto de una página.

> **Nota docente:** los scripts son `preinst`, `postinst`, `prerm` y `postrm`. Los archivos de configuración se marcan como `conffiles` y reciben un trato especial al actualizar y al quitar; se ve con `remove` y `purge`.

---

<a id="dpkg_y_apt"></a>

### dpkg y APT

```text
repositorio  →  APT  →  dpkg  →  sistema
```

| Herramienta | Qué hace |
| --- | --- |
| `dpkg` | Instala y consulta un `.deb` que ya está en el equipo. No descarga ni resuelve dependencias. |
| APT | Busca en los repositorios, descarga, calcula dependencias y le pasa los paquetes a `dpkg`. |

En el día a día usamos APT. `dpkg` queda para consultar lo instalado.

> **Nota docente:** la base de datos de lo instalado está en `/var/lib/dpkg/` y no se edita a mano.

---

<a id="apt"></a>

## APT

El uso diario.

---

<a id="update_no_actualiza_programas"></a>

### update no actualiza programas

```bash
sudo apt update     # baja la lista de paquetes disponibles
sudo apt upgrade    # instala las versiones nuevas
```

- `update` actualiza los índices: qué paquetes y versiones hay en los repositorios.
- `upgrade` compara lo instalado con esos índices y actualiza.
- Siempre en ese orden. Sin `update`, APT compara contra una lista vieja.

> **Nota docente:** los índices quedan en `/var/lib/apt/lists/`. En la VM, el último `update` fue el del Lab 9.

---

<a id="que_hay_para_actualizar"></a>

### ¿Qué hay para actualizar?

```bash
apt list --upgradable
```

```text
Listando...
base-files/stable 13.8+deb13u7 amd64 [actualizable desde: 13.8+deb13u6]
bash/stable 5.2.37-2+b10 amd64 [actualizable desde: 5.2.37-2+b9]
bind9-host/stable-security 1:9.20.29-1~deb13u1 amd64 [actualizable desde: 1:9.20.26-1~deb13u1]
```

Paquete, repositorio, versión nueva y versión instalada. Lo que viene de `stable-security` es una corrección de seguridad.

> **Nota docente:** salida real de la VM, recortada. No necesita `sudo` y usa los índices del último `update`.

---

<a id="upgrade_y_full_upgrade"></a>

### upgrade y full-upgrade

| Comando | Qué hace |
| --- | --- |
| `sudo apt upgrade` | Actualiza sin quitar ningún paquete |
| `sudo apt full-upgrade` | Puede quitar paquetes para resolver dependencias |

`full-upgrade` se usa, por ejemplo, al pasar a una versión nueva de Debian. Antes de confirmar, hay que leer qué va a quitar.

> **Nota docente:** `apt upgrade` puede instalar paquetes nuevos si una actualización los pide; `apt-get upgrade` no. El cambio de versión de Debian queda fuera de la clase.

---

<a id="leer_antes_de_confirmar"></a>

### Leer antes de confirmar

```bash
sudo apt install mc
```

```text
Installing:
  mc

Installing dependencies:
  libssh2-1t64  mailcap  mc-data  unzip

Summary:
  Upgrading: 0, Installing: 5, Removing: 0, Not Upgrading: 41
```

- Qué instala y qué dependencias agrega.
- Qué actualiza y qué **quita**.
- Cuánto descarga y cuánto espacio ocupa.

Recién después pregunta `Continue? [S/n]`.

> **Nota docente:** salida real de `apt install -s mc` (simulación sin `sudo`), sin la lista de sugeridos; la instalación real agrega `Download size` y `Space needed`. En APT 3 los títulos del resumen salen en inglés. `mailcap` y `unzip` no son dependencias sino recomendados: APT los instala por omisión. Instalar también puede actualizar otros paquetes, cuando una dependencia pide una versión más nueva: en la VM pasó con `libglib2.0-0t64`. `-y` saltea la pregunta; reservarlo para scripts probados.

---

<a id="instalar_y_quitar"></a>

### Instalar y quitar

| Comando | Qué hace |
| --- | --- |
| `sudo apt install mc` | Instala el paquete y sus dependencias |
| `sudo apt remove mc` | Quita el programa y deja su configuración en `/etc` |
| `sudo apt purge mc` | Quita el programa y su configuración |
| `sudo apt autoremove` | Quita dependencias que ya nadie usa |

> **Nota docente:** APT marca qué pidió el administrador y qué entró como dependencia; `autoremove` usa esa marca y no quita lo que otro paquete recomienda. En la VM: `remove` dejó `rc` y los nueve archivos de `/etc/mc/`; `purge` mostró `mc*` y borró `/etc/mc/`; `autoremove` quitó `libssh2-1t64` y `mc-data`. Cada operación queda en `/var/log/apt/history.log` con el usuario que la pidió.

---

<a id="consultas"></a>

### Consultas

- ¿Por qué después de `apt update` no cambió ningún programa?
- ¿Qué diferencia hay entre `remove` y `purge`?

---

<a id="dpkg"></a>

## dpkg

Consultar lo que está instalado.

---

<a id="consultas_con_dpkg"></a>

### Consultas con dpkg

```bash
dpkg -l tree            # ¿está instalado?
dpkg -L tree            # ¿qué archivos instaló?
dpkg -S /usr/bin/tree   # ¿de qué paquete viene este archivo?
dpkg -S $(which tree)   # lo mismo, sin saber la ruta
```

| Estado en `dpkg -l` | Significado |
| --- | --- |
| `ii` | Instalado |
| `rc` | Quitado, pero queda su configuración |

Ninguna de estas consultas necesita `sudo`.

> **Nota docente:** salidas reales; `tree` ya está instalado en la VM. `sshd_config` no es de ningún paquete: lo genera el script de instalación de `openssh-server` a partir de `/usr/share/openssh/sshd_config`, que sí es suyo. Un archivo sin dueño lo copió alguien o lo creó un script, y vale la pena averiguar cuál.

---

<a id="un_deb_a_mano"></a>

### Un .deb a mano

Se puede instalar un paquete `.deb` directamente

```bash
apt download mc          # baja el .deb, no instala
dpkg-deb -I mc_*.deb     # metadatos
dpkg-deb -c mc_*.deb     # contenido
```

```text
 Package: mc
 Version: 3:4.8.33-1+deb13u1
 Depends: libc6 (>= 2.38), libext2fs2t64 (>= 1.37), libglib2.0-0t64 (>= 2.78.0), libgpm2 (>= 1.20.7), libslang2 (>= 2.2.4), libssh2-1t64 (>= 1.2.8), mc-data (= 3:4.8.33-1+deb13u1)
 Recommends: mailcap, perl, sensible-utils, unzip
```

> **Nota docente:** salida real de la VM, recortada. `+deb13u1` indica la primera actualización del paquete para Debian 13. `3:` es la época, que se usa cuando cambia el esquema de numeración; no hace falta explicarla salvo que pregunten. La línea de `Depends` es larga: al pasarla a HTML, revisar que no se salga del marco.

---

<a id="dpkg_i_no_resuelve_dependencias"></a>

### dpkg -i no resuelve dependencias

```bash
sudo dpkg -i mc_*.deb          # falla por dependencias
sudo apt install ./mc_*.deb    # APT trae lo que falta
```

```text
dpkg: problemas de dependencias impiden la configuración de mc:
 mc depende de libssh2-1t64 (>= 1.2.8); sin embargo:
  El paquete `libssh2-1t64' no está instalado.
...
 problemas de dependencias - se deja sin configurar
```

- `dpkg -i` deja el paquete a medio instalar: `iU` en `dpkg -l`.
- `sudo apt --fix-broken install` completa lo que falta.
- Sin el `./`, APT busca un paquete con ese nombre en los repositorios.

> **Nota docente:** salida real, recortada. `--fix-broken` instaló `libssh2-1t64` y `mc-data`, pero no los recomendados (`mailcap`, `unzip`). Es la demostración docente; en el laboratorio se usa directamente `apt install ./`. `apt download` guarda el archivo como `mc_3%3a4.8.33-1+deb13u1_amd64.deb` (el `%3a` reemplaza los dos puntos), por eso conviene `mc_*.deb`.

---

<a id="un_deb_suelto_no_se_actualiza"></a>

### Un .deb suelto no se actualiza

- APT actualiza lo que viene de sus repositorios.
- Un `.deb` bajado de una página queda en la versión que se instaló.
- Algunos proveedores agregan su repositorio al instalar el `.deb`. Conviene revisar `sources.list.d/` después.

> **Nota docente:** es la pregunta de seguridad de la clase: quién va a aplicar los parches de lo que se instala por fuera.

---

<a id="consultas_2"></a>

### Consultas

- ¿Qué hace `dpkg` que no hace APT, y al revés?
- Si instalás un `.deb` bajado de una página, ¿quién lo actualiza?

---

<a id="repositorios"></a>

## Repositorios

De dónde viene el software.

---

<a id="los_repositorios_de_la_vm"></a>

### Los repositorios de la VM

```bash
cat /etc/apt/sources.list
```

```text
deb http://deb.debian.org/debian/ trixie main non-free-firmware
deb-src http://deb.debian.org/debian/ trixie main non-free-firmware

deb http://security.debian.org/debian-security trixie-security main non-free-firmware
deb-src http://security.debian.org/debian-security trixie-security main non-free-firmware

deb http://deb.debian.org/debian/ trixie-updates main non-free-firmware
deb-src http://deb.debian.org/debian/ trixie-updates main non-free-firmware
```

> **Nota docente:** salida real, sin los comentarios. El instalador de Debian 13 dejó el formato de una línea y `sources.list.d/` vacío. También quedó comentada la línea del medio de instalación (`#deb cdrom:...`).

---

<a id="como_se_lee_una_linea"></a>

### Cómo se lee una línea

`deb http://deb.debian.org/debian/ trixie main non-free-firmware`

| Parte | Qué indica |
| --- | --- |
| `deb` / `deb-src` | Paquetes para instalar / código fuente |
| URL | Servidor del repositorio |
| `trixie` | Versión: Debian 13 |
| `main non-free-firmware` | Componentes |

- `trixie-security`: correcciones de seguridad. Es el más importante en un servidor.
- `trixie-updates`: cambios que no esperan al siguiente lanzamiento menor.

> **Nota docente:** componentes: `main` es libre; `contrib` es libre pero depende de algo no libre; `non-free` no es libre; `non-free-firmware` es firmware no libre, separado desde Debian 12. Las líneas `deb-src` hacen que `update` baje unos 57 MB más de índices de código fuente; en un servidor que no compila se pueden comentar.

---

<a id="el_formato_nuevo_deb822"></a>

### El formato nuevo: deb822

`/etc/apt/sources.list.d/debian.sources`

```text
Types: deb deb-src
URIs: http://deb.debian.org/debian/
Suites: trixie
Components: main non-free-firmware
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg
```

- Lo mismo que la línea, un dato por renglón.
- `Signed-By` indica con qué clave se verifica ese repositorio.
- Los dos formatos funcionan en Debian 13.

> **Nota docente:** es el primer bloque que propone `apt modernize-sources` para la VM (salida real). Un bloque puede reunir varias suites y se desactiva con `Enabled: no`.

---

<a id="apt_modernize_sources"></a>

### apt modernize-sources

```bash
sudo apt modernize-sources
```

- Convierte `sources.list` al formato `.sources`.
- Agrega `Signed-By` cuando puede deducirlo.
- Guarda el original como `sources.list.bak`.
- Si respondés `n`, muestra lo que haría sin cambiar nada.

> **Nota docente:** en clase se muestra la simulación, respondiendo `n`. Probada en la VM sobre una copia; propone un bloque para `trixie`, otro para `trixie-security` y otro para `trixie-updates`.

---

<a id="firmas_por_que_confiamos"></a>

### Firmas: por qué confiamos

- Cada repositorio publica sus índices firmados.
- APT verifica esa firma con las claves de `/usr/share/keyrings/`.
- Los índices tienen la suma de verificación de cada paquete.
- Un archivo alterado no pasa la verificación, aunque llegue por HTTP.

Si `apt update` da un error de firma, **no se usa ese repositorio** hasta saber por qué.

> **Nota docente:** el archivo firmado es `InRelease`. Las claves de Debian vienen en el paquete `debian-archive-keyring`. Hay tutoriales que resuelven el error con `[trusted=yes]`, que desactiva la verificación; en un servidor no se hace. Por eso los repositorios de Debian funcionan por HTTP: la integridad la da la firma.

---

<a id="repositorios_de_terceros"></a>

### Repositorios de terceros

```text
Types: deb
URIs: https://repo.ejemplo.com/debian
Suites: trixie
Components: stable
Signed-By: /etc/apt/keyrings/ejemplo.asc
```

- La clave del proveedor va en `/etc/apt/keyrings/`.
- Solo sirve para su repositorio.
- Agregar un repositorio le permite a ese proveedor instalar y actualizar software **como root** en el servidor.

> **Nota docente:** ejemplo inventado, solo para leer; no se agrega ninguno. Docker, que el docente usa para Nginx Proxy Manager, sigue este esquema: si se quiere mostrar, revisar antes su guía oficial. En la VM, `/etc/apt/keyrings/` está vacío.

---

<a id="de_donde_viene_esta_version"></a>

### ¿De dónde viene esta versión?

```bash
apt policy htop
```

```text
htop:
  Instalados: 3.4.1-5
  Candidato:  3.4.1-5
  Tabla de versión:
 *** 3.4.1-5 500
        500 http://deb.debian.org/debian trixie/main amd64 Packages
        100 /var/lib/dpkg/status
```

Versión instalada, versión que instalaría APT y repositorio de origen.

> **Nota docente:** salida real de la VM. Los `***` marcan lo instalado. Los números 500 y 100 son prioridades; no se explican (pinning queda fuera).

---

<a id="antes_y_ahora"></a>

### Antes y ahora

| Antes | En Debian 13 |
| --- | --- |
| `apt-get` y `apt-cache` | `apt` en la terminal; los anteriores, en scripts |
| Solo `sources.list`, una línea por repositorio | También archivos `.sources` (deb822) |
| `apt-key add`: una clave valía para todos los repositorios | `Signed-By`: cada clave vale para su repositorio |
| `apt-key` | Ya no existe |
| APT 2 con `gpgv` | APT 3 con `sqv` (Sequoia) |

Si un tutorial empieza con `apt-key add`, es viejo y no funciona en Debian 13.

> **Nota docente:** con `apt-key`, la clave de un proveedor podía firmar paquetes que reemplazaran a los de Debian. En la VM, `command -v apt-key` no devuelve nada y la firma la verifica `sqv`. `apt` existe desde 2014 (APT 1.0). APT 3 también cambió el formato del resumen de instalación. Las claves de `/usr/share/keyrings/` ahora son archivos `.pgp`.

---

<a id="consultas_3"></a>

### Consultas

- ¿Qué pasa si `apt update` da un error de firma?

---

<a id="otras_distribuciones"></a>

## Otras distribuciones

Ubuntu y Rocky Linux.

---

<a id="ubuntu"></a>

### Ubuntu

Misma familia: `.deb`, `dpkg` y `apt`. Todo lo de hoy vale.

| Diferencia | En Ubuntu |
| --- | --- |
| Componentes | `main`, `restricted`, `universe`, `multiverse` |
| Repositorios | `/etc/apt/sources.list.d/ubuntu.sources` (deb822 desde 24.04) |
| Repositorios personales | PPA, con `add-apt-repository` |
| Otro formato | Snap, junto a los `.deb` |

> **Nota docente:** Ubuntu 26.04 LTS trae APT 3.1 y la instalación nueva no crea `sources.list`. Un PPA es un repositorio de terceros, con las mismas precauciones.

---

<a id="snap_en_ubuntu"></a>

### Snap en Ubuntu

```bash
snap list              # snaps instalados
snap info lxd          # versiones y canales disponibles
sudo snap install lxd
sudo snap refresh      # actualizar los snaps
```

- `snapd` viene instalado en todo Ubuntu, de escritorio y servidor. En escritorio, Firefox ya es un snap; el instalador de servidor ofrece snaps destacados.
- Un snap trae el programa con sus bibliotecas y corre aislado del resto del sistema.
- Viene de la tienda de Canonical, no de los repositorios de APT.
- Se actualiza solo, varias veces por día. `apt upgrade` no lo toca.

> **Nota docente:** la pregunta de la clase vale también acá: quién verificó el snap y quién lo actualiza. Los de editores verificados los publica el propio proyecto; los demás, cualquiera con una cuenta en la tienda. Cada snap se monta como un sistema de archivos aparte, y por eso aparecen dispositivos `loop` en `lsblk` y `df` (sirve para la clase 12). Las actualizaciones automáticas se pueden postergar con `snap refresh --hold`. En Ubuntu, algunos paquetes de `apt` solo instalan el snap equivalente (por ejemplo, `chromium`). Comandos no probados en una VM del curso: no hay VM con Ubuntu.

---

<a id="flatpak"></a>

### Flatpak

Formato para aplicaciones de escritorio que funcionan igual en cualquier distribución.

```bash
sudo apt install flatpak
flatpak remote-add --if-not-exists flathub \
    https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install flathub org.gimp.GIMP
flatpak update
```

- Las aplicaciones vienen de fuentes que se agregan; la más usada es Flathub.
- Cada aplicación trae lo que necesita y corre aislada.
- APT no las actualiza: se usa `flatpak update`.
- En Fedora, Linux Mint o Pop!_OS ya viene instalado. En Debian y Ubuntu hay que instalarlo.

> **Nota docente:** en Debian, el programa `flatpak` está en el repositorio oficial (en la VM, 1.16.6 desde `trixie-security`), pero las aplicaciones vienen de Flathub, no de Debian. Fedora Workstation trae Flatpak con sus propias aplicaciones, y Flathub se habilita al activar los repositorios de terceros. Linux Mint y Pop!_OS lo traen con Flathub listo; elementary OS lo usa en su tienda. Ubuntu no lo trae y, desde 23.04, tampoco sus variantes oficiales. Varias aplicaciones comparten entornos base (*runtimes*), así que la primera instalación baja bastante más que la aplicación. Flathub marca como verificadas las que publica el propio desarrollador. En servidores casi no se usa. Comandos no probados en una VM del curso.

---

<a id="rocky_linux_9"></a>

### Rocky Linux 9

- Familia Red Hat: compatible con Red Hat Enterprise Linux.
- Paquetes `.rpm`; `rpm` consulta lo instalado y `dnf` maneja repositorios y dependencias.
- Elegimos la versión 9 porque pide menos hardware que la 10.
- Soporte de seguridad hasta mayo de 2032.

> **Nota docente:** Rocky 9 funciona con CPU x86-64-v2; Rocky 10 exige x86-64-v3 (AVX2), que no todas las computadoras tienen. Soporte general hasta el 31 de mayo de 2027 y de seguridad hasta el 31 de mayo de 2032. `yum` sigue existiendo como otro nombre de `dnf`. `zypper` aparece en la diapositiva de otros gestores.

---

<a id="apt_y_dnf"></a>

### apt y dnf

| Debian / Ubuntu | Rocky Linux |
| --- | --- |
| `apt update` | `dnf check-update` |
| `apt update && apt upgrade` | `dnf upgrade` (o `dnf update`) |
| `apt install` / `remove` | `dnf install` / `remove` |
| `apt search` / `show` | `dnf search` / `info` |
| `dpkg -L paquete` | `rpm -ql paquete` |
| `dpkg -S archivo` | `rpm -qf archivo` |
| `/etc/apt/sources.list.d/` | `/etc/yum.repos.d/*.repo` |

> **Nota docente:** `dnf update` es otro nombre de `dnf upgrade`. Como `dnf` refresca solo los índices vencidos, un `dnf upgrade` hace lo que en Debian son dos pasos: `apt update` y `apt upgrade`. `dnf check-update` solo lista lo pendiente. `dpkg -l` equivale a `rpm -qa`; `apt autoremove`, a `dnf autoremove`. En la VM, `yum` y `dnf` son enlaces al mismo programa (`dnf-3`, DNF 4.14).

---

<a id="repositorios_en_rocky"></a>

### Repositorios en Rocky

`/etc/yum.repos.d/rocky.repo`

```text
[baseos]
name=Rocky Linux $releasever - BaseOS
mirrorlist=https://mirrors.rockylinux.org/mirrorlist?arch=$basearch&repo=BaseOS-$releasever$rltype
gpgcheck=1
enabled=1
metadata_expire=6h
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-Rocky-9
```

- `gpgcheck=1` y `gpgkey=`: cada repositorio declara su clave, como `Signed-By`.
- `metadata_expire=6h`: `dnf` actualiza los índices solo. No hay un paso como `apt update`.
- `dnf repolist` muestra los activos: `baseos`, `appstream` y `extras`.

> **Nota docente:** bloque real de la VM Rocky 9.8, sin la línea `countme`. Los repositorios de depuración y de código fuente vienen con `enabled=0`. `rocky-security.repo` trae un repositorio `security` desactivado, creado en mayo de 2026 para correcciones urgentes que salen antes que las de Red Hat (`sudo dnf --enablerepo=security update`); solo si preguntan.

---

<a id="quitar_en_rocky"></a>

### Quitar en Rocky

```bash
sudo dnf remove mc
```

```text
advertencia:/etc/mc/mc.menu saved as /etc/mc/mc.menu.rpmsave
```

- No hay `purge`. Lo que modificaste en la configuración queda como `.rpmsave`; lo demás se borra.
- `dnf remove` quita también las dependencias que ya no hacen falta, sin `autoremove`.
- `rpm -V paquete` muestra qué archivos del paquete cambiaron.

> **Nota docente:** salida real. Antes de quitar `mc` se agregó una línea a `mc.menu`, y `rpm -V mc` la detectó (`S.5....T.  c /etc/mc/mc.menu`). En Rocky, `mc` instaló 59 paquetes (casi todos de Perl) y `dnf remove` los quitó todos, porque `/etc/dnf/dnf.conf` trae `clean_requirements_on_remove=True`. En Debian fueron 5 paquetes. `rpm -qc paquete` lista sus archivos de configuración.

---

<a id="epel"></a>

### EPEL

```bash
dnf info htop                    # no aparece: Rocky no lo trae
sudo dnf install epel-release    # agrega el repositorio EPEL
sudo dnf install htop
```

```text
Importando llave GPG 0x3228467C:
 Huella    : FF8A D134 4597 106E CE81 3B91 8A38 72BF 3228 467C
 Desde     : /etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-9
```

- EPEL: paquetes extra para Enterprise Linux, mantenidos por Fedora.
- La primera vez, `dnf` pide aceptar su clave. Ahí se decide si se confía en ese repositorio.
- `dnf provides /usr/bin/htop` busca qué paquete trae un archivo, aunque no esté instalado.

> **Nota docente:** salida real. `htop` sale del repositorio principal en Debian; en Rocky necesita EPEL. `epel-release` viene en `extras` y agrega `/etc/yum.repos.d/epel.repo` y la clave en `/etc/pki/rpm-gpg/`. Habilitar EPEL es agregar un repositorio de terceros. Sin `sudo`, `dnf` arma una caché propia y vuelve a bajar los índices (en la VM, 197 MB y varios minutos con EPEL); en clase conviene usar `sudo dnf` también para consultar. `dpkg -S` solo busca en lo instalado; `dnf provides` busca también en los repositorios.

---

<a id="otros_gestores_de_paquetes"></a>

### Otros gestores de paquetes

| Distribución | Paquetes | Gestor | Instalar | Actualizar todo |
| --- | --- | --- | --- | --- |
| Debian, Ubuntu | `.deb` | `apt` | `apt install` | `apt update && apt upgrade` |
| Rocky, RHEL, Fedora | `.rpm` | `dnf` | `dnf install` | `dnf upgrade` |
| openSUSE, SLES | `.rpm` | `zypper` | `zypper install` | `zypper update` |
| Arch Linux | `.pkg.tar.zst` | `pacman` | `pacman -S` | `pacman -Syu` |
| Alpine Linux | `.apk` | `apk` | `apk add` | `apk update && apk upgrade` |

La idea es la misma en todos: repositorios firmados, dependencias y un registro de lo instalado.

> **Nota docente:** Alpine es muy chica y aparece sobre todo en contenedores: muchas imágenes de Docker parten de ella, así que `apk add` se ve seguido en un `Dockerfile`. Arch es de actualización continua (*rolling release*), sin versiones como Debian 13; poco común en servidores. SUSE usa `.rpm` como Red Hat, con otro gestor. Si preguntan: Gentoo compila todo desde el código fuente con `emerge`, y AppImage es un único archivo ejecutable con la aplicación y sus bibliotecas, sin instalación.

---

<a id="consultas_4"></a>

### Consultas

- ¿Qué tienen en común `apt`, `dnf` y los demás gestores?

---

<a id="seguridad_al_instalar_software"></a>

### Seguridad al instalar software

- Lo que viene de Debian lo firma y lo actualiza Debian.
- Un `.deb` suelto, un repositorio de terceros o un `curl | sudo bash` obligan a responder:
  - ¿Quién verificó de dónde viene?
  - ¿Quién va a aplicar sus parches?

Revisión mínima:

```bash
apt list --upgradable
ls /etc/apt/sources.list.d/
```

> **Nota docente:** esta diapositiva cumple la función del resumen.

---

<a id="labs_clase"></a>

### Actividad práctica — Laboratorio 10

**Objetivo:** mantener actualizado un servidor Debian e instalar y quitar software sabiendo de dónde viene.

- Leer los repositorios de la VM y el origen de un paquete.
- Actualizar el sistema leyendo el resumen antes de confirmar.
- Consultar lo instalado con `dpkg`.
- Instalar `mc` desde un `.deb` y quitarlo con `remove` y `purge`.

[Laboratorio 10 — Paquetes y software](https://github.com/kity-linuxero/linux410-labs/blob/main/lab10/lab10.md)

> **Nota docente:** el laboratorio no está escrito todavía. Cuenta administradora solamente; necesita Internet en la VM. El segundo laboratorio, con Rocky Linux 9, está a confirmar.

---

<a id="referencias"></a>

### Referencias

- Ayuda local: `man apt`, `man apt-get`, `man dpkg`, `man sources.list`.
- [Debian Reference, capítulo 2: gestión de paquetes](https://www.debian.org/doc/manuals/debian-reference/ch02.es.html).
- [Notas de la versión de Debian 13](https://www.debian.org/releases/trixie/release-notes/).
- [Rocky Linux — versiones y soporte](https://wiki.rockylinux.org/rocky/version/).
