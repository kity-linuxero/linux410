# Administración de servidores GNU/Linux
## Clase 3: Instalación del sistema — Arranque, particiones y FHS
*Módulo 1 — Cuestiones básicas antes de instalar el primer servidor*

---

### Temas de la clase

- Cómo arranca un equipo
- BIOS y UEFI
- El arranque de Linux: GRUB, kernel e initramfs
- Gestión de servidores físicos
- Discos, particiones y tablas de partición
- Sistemas de archivos y puntos de montaje
- FHS (*Filesystem Hierarchy Standard*)
- Panorama de la instalación de Debian

---

### Objetivos de la clase

Al finalizar la clase vas a poder:

- Describir la secuencia de arranque de un equipo, desde el firmware hasta el inicio de sesión.
- Diferenciar BIOS (legacy) de UEFI y explicar qué es la ESP.
- Explicar la función del initramfs.
- Reconocer la capa de gestión adicional que tiene un servidor físico y que una VM no muestra.
- Diferenciar MBR de GPT y definir un esquema de particionado razonable.
- Explicar qué es un punto de montaje y por qué Linux no utiliza letras de unidad.
- Ubicar los directorios principales del FHS.
- Instalar Debian 13 en la VM creada en la Clase 2.

> **Por qué vemos este tema:** antes de instalar un sistema operativo conviene entender qué decisiones toma el instalador y cuál es su impacto. Estos conceptos son la base del laboratorio.

---

# Sección 1: Cómo arranca un equipo

### Desde el encendido hasta el shell

La secuencia general es la misma en una notebook, un servidor de rack o una VM. Lo que cambia es la implementación de cada componente, no el orden.

- **Firmware (BIOS/UEFI):** es el primer software que se ejecuta. Inicializa el hardware, realiza el POST y busca el dispositivo de arranque.
- **Bootloader (GRUB):** recibe el control del firmware y carga el kernel en memoria.
- **Kernel:** toma el control del hardware y monta el sistema de archivos raíz.
- **Init (systemd):** es el primer proceso del espacio de usuario, PID 1, e inicia el resto de los servicios.

> **Firmware → Bootloader → Kernel → Init → Login**

La secuencia también existe en Windows, aunque cada sistema implementa sus propios componentes. Es relevante porque el instalador de Debian interviene en dos puntos: dónde instala el bootloader y qué estructura de particiones utiliza para que el firmware pueda encontrarlo.

---

### Consultas
*(Firmware → Bootloader → Kernel → Init)*

---

# Sección 2: BIOS y UEFI

### Dos formas de arrancar

| Característica | BIOS (legacy) | UEFI |
| :--- | :--- | :--- |
| **Antigüedad** | Desde la década de 1980 | Estándar desde aproximadamente 2010 |
| **Tabla de particiones habitual** | MBR | GPT |
| **Límite de tamaño de disco** | 2 TiB | Prácticamente sin límite práctico |
| **Interfaz** | Modo texto | Gráfica, con mouse y red |
| **Seguridad** | No incluye Secure Boot | Puede incluir Secure Boot |
| **Ubicación del bootloader** | Sector de arranque del disco | Partición dedicada (ESP) |

- La BIOS clásica se ejecutaba en modo de 16 bits, con acceso limitado a memoria y discos. UEFI funciona en un entorno más moderno y puede acceder a todos los dispositivos disponibles.
- Actualmente, casi todo el hardware nuevo y las VM modernas utilizan UEFI. Muchos equipos conservan un modo de compatibilidad BIOS llamado **CSM**, aunque su uso es cada vez menos frecuente.
- VirtualBox permite elegir el firmware de la VM (EFI activado o desactivado), y esa decisión se refleja en el modo de particionar el disco.

> UEFI combina un firmware moderno con una partición de arranque de formato específico. La ESP permite identificar con claridad dónde se encuentran los archivos necesarios para arrancar.

*Fuente: [Debian Wiki — UEFI](https://wiki.debian.org/UEFI)*

---

### Secure Boot

- Es un mecanismo de UEFI que verifica la firma del software ejecutado antes de iniciar el sistema operativo.
- Su objetivo es impedir la ejecución de código no autorizado durante las primeras etapas del arranque.
- Desde Debian 10, Debian lo admite mediante **shim**, un cargador pequeño firmado por Microsoft que incorpora las claves de Debian. No es necesario desactivarlo para instalar el sistema.
- Al utilizar controladores de terceros —por ejemplo, los de NVIDIA— puede ser necesario desactivar Secure Boot o firmar los módulos manualmente.

*Fuente: [Debian Wiki — Secure Boot](https://wiki.debian.org/SecureBoot)*

---

### Gestión de un servidor físico

En una VM vemos únicamente lo que expone el sistema operativo. Un servidor físico incorpora además una capa de gestión independiente:

- **BMC:** microcontrolador con CPU, memoria y conexión de red propias, capaz de funcionar aunque el servidor esté apagado.
- Cada fabricante utiliza su propia denominación: **iLO** (HPE), **iDRAC** (Dell) y **XClarity** (Lenovo).
- Permite encender y apagar el equipo, consultar sensores, montar una ISO remota y abrir una consola por red. Este tipo de administración se denomina **fuera de banda** (*out-of-band*).
- Se administra mediante **IPMI** —más antiguo— o **Redfish** —basado en REST y JSON, estándar actual del DMTF—.
- Las controladoras RAID también disponen de firmware propio para su configuración, antes de que intervenga el sistema operativo.

> No vamos a utilizar estas herramientas durante el curso, pero es importante conocerlas al trabajar con hardware físico.

*Fuente: [DMTF — Redfish](https://www.dmtf.org/standards/redfish)*

---

### Consultas
*(BIOS/MBR · UEFI/GPT/ESP · BMC para gestión fuera de banda)*

---

# Sección 3: El arranque de Linux

### GRUB: el gestor de arranque

- **GRUB** (*GRand Unified Bootloader*) es el bootloader estándar de Debian y de muchas distribuciones.
- Es el menú que puede aparecer durante unos segundos al iniciar: permite elegir entre kernels, iniciar en modo de recuperación o arrancar otro sistema operativo.
- Su función es localizar el kernel, cargarlo en memoria, pasarle sus parámetros y cederle el control.
- Su configuración se encuentra en `/boot/grub/`; los archivos `.efi` están en la ESP, montada habitualmente en `/boot/efi`.

> En un servidor sin monitor, GRUB no suele verse. Aun así, conviene conocer su función: cuando un equipo no arranca, el problema puede estar en esta etapa.

---

### Initramfs: el sistema mínimo de arranque

Para montar el sistema de archivos raíz (`/`), el kernel necesita controladores para el disco, el sistema de archivos y, en algunos casos, RAID o LVM. Sin embargo, esos controladores pueden estar almacenados dentro de la raíz que todavía no se montó.

- El **initramfs** resuelve esta dependencia inicial: es un sistema de archivos mínimo y comprimido que GRUB carga en RAM junto con el kernel.
- Contiene los módulos del kernel necesarios para el arranque y un conjunto reducido de herramientas básicas.
- El kernel utiliza este sistema temporal, carga los controladores requeridos, monta la raíz real y luego cede el control a **systemd**.
- Es un archivo visible en `/boot`: `/boot/initrd.img-<versión>`. El kernel correspondiente se encuentra en `/boot/vmlinuz-<versión>`.

> El initramfs se regenera al actualizar el kernel o modificar componentes de almacenamiento. Si está incompleto o es incorrecto, el sistema puede no encontrar el sistema de archivos raíz durante el arranque.

---

### Secuencia completa de arranque

```text
1. Firmware (UEFI)     → realiza el POST, inicializa el hardware y lee la ESP
2. GRUB                → carga el kernel y el initramfs en RAM
3. Kernel              → inicia con el initramfs como raíz temporal
4. Initramfs           → carga controladores, encuentra y monta la raíz real
5. systemd (PID 1)     → inicia los servicios definidos
6. Login               → consola local o SSH
```

> A partir del punto 5 comienza el funcionamiento habitual del sistema. Las etapas previas ocurren en pocos segundos y suelen hacerse visibles solo ante un problema.

---

### Consultas
*(GRUB · initramfs y su función · systemd como PID 1)*

---

# Sección 4: Discos y particiones

### Cómo se nombran los discos en Linux

Antes de particionar, es importante saber interpretar los nombres de los dispositivos. En Linux aparecen como archivos dentro de `/dev`:

| Nombre | Qué representa |
| :--- | :--- |
| `/dev/sda` | Primer disco SATA, SAS o USB. El segundo suele ser `sdb`, y así sucesivamente. |
| `/dev/sda1` | Primera partición de ese disco. |
| `/dev/nvme0n1` | Primer disco NVMe. Sus particiones se denominan `nvme0n1p1`, `nvme0n1p2`, etc. |
| `/dev/vda` | Disco paravirtualizado (virtio), habitual en KVM y Proxmox. |
| `/dev/sr0` | Unidad de CD/DVD. |

> En VirtualBox con controladora SATA veremos `/dev/sda`. El orden de estos nombres puede cambiar entre arranques cuando hay varios discos; por eso los sistemas actuales identifican las particiones mediante **UUID** y no solo por nombre.

---

### ¿Qué es particionar?

- Es dividir un dispositivo de almacenamiento en secciones lógicas independientes, cada una con su propio sistema de archivos.
- Permite separar el sistema operativo de los datos y aplicar políticas distintas a cada área.

---

### MBR y GPT

| Característica | MBR (*Master Boot Record*) | GPT (*GUID Partition Table*) |
| :--- | :--- | :--- |
| **Firmware asociado** | BIOS | UEFI |
| **Máximo de particiones primarias** | 4 (o 3 + una extendida) | 128 |
| **Tamaño máximo de disco** | 2 TiB | Sin límite práctico para los usos actuales |
| **Redundancia** | No; hay un único punto de falla | Conserva una copia de la tabla al final del disco |
| **Uso actual** | Discos antiguos o compatibilidad | Estándar actual |

- Las particiones **extendidas y lógicas** fueron una solución para superar el límite de cuatro particiones primarias de MBR. Con GPT ya no son necesarias.
- El instalador de Debian selecciona normalmente `gpt` en sistemas UEFI y `msdos` (MBR) en equipos con BIOS antigua.

*Fuente: [Manual de instalación de Debian — Programas para particionar](https://www.debian.org/releases/stable/amd64/apcs05.es.html)*

---

### ESP (*EFI System Partition*)

- Es una partición pequeña, de algunos cientos de MB, formateada en **FAT32**.
- Almacena los bootloaders como archivos `.efi`. En Debian, GRUB se instala en `EFI/debian/`.
- FAT32 no es una elección arbitraria: la especificación UEFI exige que el firmware pueda leerlo.
- En Linux suele montarse en `/boot/efi`.
- Si el equipo comparte Windows y Linux, ambos sistemas utilizan la misma ESP, cada uno en su propio subdirectorio.

---

### Partición Swap

- Es espacio en disco que el kernel puede usar como extensión de la RAM cuando esta se llena.
- Puede implementarse como una **partición dedicada** (con su propio fs) o como un **archivo de swap** dentro de una partición existente. El archivo ofrece mayor flexibilidad, ya que puede ampliarse o eliminarse sin modificar la tabla de particiones.
- La regla antigua de asignar el doble de la RAM ya no es apropiada para servidores con grandes cantidades de memoria.
- Una cantidad moderada de swap permite liberar páginas de memoria poco utilizadas. Un uso continuo e intenso de swap suele indicar falta de RAM.
- En el laboratorio usaremos una partición dedicada para simplificar el esquema, ya que es la forma predeterminada que se instala Debian.

> Una alternativa interesante es **zram**, que usa espacio comprimido en la RAM como swap, sin recurrir al disco. Lo veremos mas adelante.
---

### Sistemas de archivos

Particionar divide el disco. **Formatear** crea dentro de una partición la estructura necesaria para almacenar archivos. Sin ver mucho en detalle, listamos los filesystem típicos en una instalación GNU/Linux.

| Sistema de archivos | Uso habitual |
| :--- | :--- |
| **ext4** | Predeterminado en Debian. Maduro, estable y adecuado para usos generales. |
| **XFS** | Predeterminado en RHEL/Rocky. Se desempeña bien con archivos grandes y alta concurrencia. |
| **Btrfs** | Incluye snapshots, checksums y RAID por software. Lo utilizan por defecto openSUSE y Fedora. |
| **ZFS** | Ofrece snapshots, RAID propio, verificación de integridad y caché en RAM (**ARC**). Por su licencia [CDDL](https://es.wikipedia.org/wiki/Common_Development_and_Distribution_License), no forma parte del kernel Linux. Se suele utilizar en ProxmoxVE.            |
| **FAT32 / NTFS** | Provenientes del entorno Windows. FAT32 es relevante aquí por la ESP. Linux tiene soporte nativo NTFS desde el kernel 5.15         |

> Durante el Lab2 usaremos **ext4**. Es la opción por defecto en Debian y otros sistemas GNU/Linux.

---

### Esquema de particionado del laboratorio

```text
ESP     (512 MB  - FAT32 - montada en /boot/efi)
swap    (2 GB    - swap)
/       (el resto - ext4)
```

El particionado será **guiado**. El asistente guiado de Debian ofrece varias opciones, pudiendo elegir una partición sola, LVM o separar varias particiones.

---

### Consultas
*(Nombres en /dev · MBR/GPT · ESP · swap · ext4)*

---

# Sección 5: Puntos de montaje y FHS

### ¿Qué es un punto de montaje?

- En Windows, cada unidad de almacenamiento (partición/disco) suele aparecer con una **letra**, como `D:` , `E:`, etc.
- En Linux no se utilizan letras de unidad. Cada dispositivo se **monta** en un directorio del único árbol de archivos; ese directorio es el **punto de montaje**.
- Al conectar, por ejemplo, un pendrive, el sistema puede montarlo en una ruta como `/media/usuario/PENDRIVE`. Desde allí, se accede a él como a cualquier otra carpeta.
- Una carpeta compartida por red —NFS o Samba— también se monta en una ruta, por ejemplo `/mnt/servidor`, y queda integrada al árbol de archivos.
- Para consultar los sistemas de archivos montados se pueden usar `mount` o `df -h`.

> El montaje puede realizarse de forma automática cuando el dispositivo se conecta, manualmente con `mount` o automáticamente durante el arranque según lo definido en `/etc/fstab`. Este archivo se estudiará en detalle en la clase de almacenamiento.

---

### Un único árbol

- Todo cuelga de la raíz `/`, sin importar en qué disco físico o recurso remoto se encuentre cada elemento.
- El **FHS** define qué se almacena en cada directorio. Gracias a esta convención, la estructura resulta predecible entre distribuciones.

*Fuentes: [Debian Wiki — FHS](https://wiki.debian.org/es/FilesystemHierarchyStandard) · [Filesystem Hierarchy Standard 3.0](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html)*

---

### Directorios principales

| Directorio | Contenido |
| :--- | :--- |
| `/` | Raíz del sistema. Todo cuelga de este directorio. |
| `/boot` | Kernel, initramfs y GRUB. Con UEFI, la ESP se monta en `/boot/efi`. |
| `/etc` | Configuración del sistema, habitualmente en texto plano. |
| `/var` | Datos variables: logs, colas de correo, bases de datos y cachés. |
| `/home` | Directorios personales de los usuarios. |
| `/usr` | Programas y librerías instalados; contiene gran parte del sistema. |
| `/tmp` | Archivos temporales; puede limpiarse en cada reinicio. |

---

### Otros directorios bajo `/`

| Directorio | Contenido |
| :--- | :--- |
| `/dev` | Dispositivos representados como archivos: discos, terminales y `/dev/null`, entre otros. |
| `/proc` | Sistema de archivos **virtual** con información del kernel y de los procesos en tiempo real. No ocupa espacio en disco. |
| `/sys` | Sistema de archivos virtual que expone la información del kernel sobre el hardware y los controladores. |
| `/run` | Datos de ejecución de los servicios: PID, sockets y bloqueos. Vive en RAM y se vacía en cada arranque. |
| `/bin` | Comandos esenciales para cualquier usuario (`ls`, `cp`, `cat`). |
| `/sbin` | Comandos de administración del sistema. |
| `/lib` | Librerías compartidas que requieren los binarios de `/bin` y `/sbin`. |
| `/mnt` | Punto de montaje temporal para uso manual del administrador. |
| `/opt` | Software de terceros no empaquetado por la distribución. |
| `/root` | Directorio personal del usuario root. **No debe confundirse con `/`.** |
| `/srv` | Datos servidos por el equipo, como sitios web o FTP. |

> **Sobre `/run`:** debe estar disponible en las primeras etapas del arranque y no debe persistir después de reiniciar. Puede contener archivos de estado de los servicios, como PID o sockets.

> En Debian moderno, `/bin`, `/sbin` y `/lib` son enlaces simbólicos (*symlinks*) a sus equivalentes dentro de `/usr`, como parte de la transición conocida como **usr-merge**. Se siguen utilizando de la misma manera, pero `ls -l /` muestra la flecha del enlace.

---

### FHS y el modelo de Windows

| | Linux (FHS) | Windows |
| :--- | :--- | :--- |
| **Configuración** | Archivos de texto en `/etc` | Registro binario y archivos distribuidos |
| **Programas** | `/usr/bin`, `/usr/lib` | `Archivos de programa` y entradas de registro |
| **Almacenamiento** | Un solo árbol; las unidades se montan **dentro** de él | Una letra por unidad de almacenamiento     |
| **Portabilidad de configuración** | Copiar un archivo de texto | Exportar claves de registro |
| **Automatización** | `grep`, `sed` y cualquier editor | Herramientas específicas |

> La configuración en archivos de texto y en ubicaciones predecibles facilita la automatización y la administración consistente de muchos servidores.

---

### Aplicación en servidores de producción

En un servidor real, no siempre conviene ubicar todo en una sola partición. Es habitual separar:

- **`/var`**, donde se escriben los logs. Si un servicio llena ese espacio, una partición separada ayuda a preservar el resto del sistema.
- **`/home`**, para conservar los datos de usuarios si es necesario reinstalar el sistema operativo.
- **`/tmp`**, que puede montarse con opciones restrictivas por motivos de seguridad.

Cada una de estas separaciones corresponde a una partición o volumen montado en un punto del árbol.

> Para aplicar esta estrategia con flexibilidad suele utilizarse LVM, ya que permite redimensionar volúmenes más adelante. Por eso en esta clase usamos el esquema simple y retomaremos el tema cuando veamos LVM.

---

### Consultas
*(Punto de montaje · árbol único · /etc, /var, /run, /proc)*

---

# Sección 6: Panorama de la instalación

### Qué vamos a instalar

- **Debian 13 “trixie”**, la versión estable actual. Debian denomina sus versiones con personajes de *Toy Story*.
- En Debian es la misma distribución usada para desktop como para server, solo que en servers no suele instalarse interfaces gráficas.
- Ramas de Debian: **stable** —la que utilizaremos, probada y con soporte de seguridad—, **testing** y **unstable**. En servidores se utiliza normalmente la rama stable, salvo una necesidad concreta.
- Arquitectura `amd64`, la habitual en equipos de 64 bits.

---

### Imagen de instalación

| Imagen | Tamaño | Uso |
| :--- | :--- | :--- |
| **netinst** | ~700 MB | Instalador mínimo que descarga paquetes de Internet durante la instalación. **Es la que usaremos.** |
| **DVD completo** | Varios GB | Incluye los paquetes necesarios para instalar sin conexión. |
| **Live** | ~2–3 GB | Sistema que inicia sin instalarse, útil para probar y orientado al escritorio. |

> La imagen netinst necesita acceso a Internet. Para eso se utilizará el Adaptador 1 (NAT) configurado en la Clase 2. También permite instalar paquetes actualizados desde el inicio.

---

### Etapas del instalador

El instalador de Debian —**debian-installer**, o *d-i*— sigue las mismas etapas principales tanto en modo gráfico como en modo texto:

1. Idioma, ubicación y teclado.
2. Red: hostname y dominio. En nuestro caso, DHCP automático.
3. Usuarios: contraseña de **root** y creación de un usuario común.
4. **Particionado**: aplicación de los conceptos vistos en clase.
5. Instalación del sistema base: los paquetes mínimos necesarios para arrancar.
6. Configuración de `apt` y selección de una réplica (*mirror*).
7. **Selección de software (`tasksel`)**.
8. Instalación de GRUB en el disco.
9. Reinicio y primer arranque

> **Sobre root:** si se deja vacía la contraseña de root, Debian no habilita esa cuenta y otorga permisos de `sudo` al usuario creado. Es el comportamiento predeterminado en Ubuntu y una práctica frecuente en servidores. En el laboratorio definiremos la contraseña de root para conocer ambas formas de administración.

*Fuente: [Guía de instalación de Debian](https://www.debian.org/releases/stable/amd64/)*

---

### Consultas
*(netinst · etapas del instalador )*

---

## Resumen de la clase

- **Arranque:** Firmware → Bootloader → Kernel → Init. La secuencia se aplica tanto a una notebook como a un servidor.
- **BIOS/MBR** corresponde al modelo anterior; **UEFI/GPT** es el estándar actual y suelen utilizarse en conjunto.
- La **ESP** es una partición FAT32 que contiene los archivos de arranque y se monta en `/boot/efi`.
- El **initramfs** proporciona los controladores iniciales que el kernel necesita antes de montar el sistema de archivos raíz.
- Un servidor físico incorpora una capa de gestión **fuera de banda** (BMC / iLO / iDRAC) que una VM no expone.
- **Discos:** `/dev/sda` y `/dev/nvme0n1`. Para identificarlos de forma estable se utilizan UUID.
- **Esquema del laboratorio:** ESP + swap + `/` en ext4, con particionado manual y sin LVM por ahora.
- **Punto de montaje:** directorio en el que se integra un disco o recurso de red al árbol de archivos. Reemplaza las letras de unidad.
- **FHS:** árbol de directorios único y predecible, con configuración en texto plano dentro de `/etc`.

---

## Actividades prácticas y laboratorios

### Actividad práctica
*Instalación de Debian 13 en una nueva VM creada*

- Enlace al laboratorio: *(pendiente de elaborar)*
