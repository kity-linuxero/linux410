<a id="inicio"></a>

# Administración de servidores GNU/Linux

## Clase 17: Redes

Módulo 2: Administración de Servidores

---

<a id="index"></a>

### Temas de la clase 17

- [Conceptos de red](#conceptos_de_red)
- [Ver y configurar la red](#ver_y_configurar_la_red)
- [Resolución de nombres de host](#nombres_del_lado_del_cliente)
- [Diagnóstico](#diagnostico)
- [Qué escucha y dónde](#que_escucha_y_donde)
- [La red del laboratorio](#la_red_del_laboratorio)
- [Actividades prácticas y laboratorios](#labs)

[Exportar a PDF](../clase17.html?print-pdf)

---

<a id="objetivos_de_la_clase"></a>

### Objetivos de la clase

Al finalizar vas a poder:

- Leer la configuración de red de un servidor: dirección, máscara, puerta de enlace y DNS.
- Dejar una dirección fija que sobreviva al reinicio.
- Saber dónde se configura la red en Debian, en Ubuntu y en Rocky.
- Diagnosticar paso a paso por qué un equipo no llega a un destino.
- Ver qué servicios escuchan y en qué interfaz.

---

<a id="lo_que_ya_vimos"></a>

### Lo que ya vimos

- [Clase 2](../clase2.html#/modos_red): los modos de red de VirtualBox.
- [Clase 4](../clase4.html#/esquema_red): el esquema con una sola placa NAT y el reenvío del puerto 2222 al 22.
- [Clase 4](../clase4.html#/verificar_ssh): `ss -tlnp` para ver si sshd escucha.
- [Clase 10](../clase10.html#/servicios_con_systemd): servicios con `systemctl`.
- [Clase 14](../clase14.html#/journalctl): `journalctl`, donde quedan los mensajes de la red.

> **Nota docente:** hoy abrimos el tramo de redes. Hasta ahora la red fue algo que simplemente andaba; hoy aprendemos a leerla, cambiarla y diagnosticarla. La clase 18 sigue con SSH.

---

<a id="conceptos_de_red"></a>

## Conceptos de red



---

<a id="interfaz_y_direccion_ip"></a>

### Interfaz y dirección IP

Una interfaz es la puerta del equipo hacia una red: una placa de red, real o virtual.

Una dirección IP es el número que identifica al equipo en esa red, como el número de una casa en una calle.

Una interfaz puede tener varias direcciones o ninguna. `enp0s8`, la segunda placa de la VM (la de la [red del laboratorio](#diseno_de_red_de_labs)), arranca sin dirección.

```text
$ ip -br -4 a
lo               UNKNOWN        127.0.0.1/8
enp0s3           UP             10.0.2.15/24
```

[`ip -br -4 a`](https://manpages.debian.org/trixie/iproute2/ip-address.8.es.html) lista las interfaces con sus direcciones. `-br` es el formato breve y `-4` muestra solo las direcciones IPv4.

`lo` es la interfaz interna del equipo; `enp0s3`, la placa de la VM.

> **Nota docente:** sin `-4`, `ip -br a` muestra también las direcciones IPv6 (las que tienen `:`), que hoy no usamos. En las VM del curso las apagamos en el laboratorio para que las salidas queden limpias. Los nombres como `enp0s3` indican el lugar de la placa en el bus; ya aparecieron con `ip a` en la clase 4. Mostrar `ip a` completo solo en la sección 3.

---

<a id="nombres_de_las_interfaces"></a>

### Nombres de las interfaces

Los nombres predecibles los arma systemd/udev a partir del hardware, y los usan Debian, Ubuntu y Rocky. Empiezan con `en` (Ethernet) o `wl` (Wi-Fi).

| Nombre | Qué indica | Dónde se ve |
| --- | --- | --- |
| `lo` | el propio equipo | todos los sistemas |
| `eth0` | clásico, numerado en orden | Docker, WSL, Raspberry Pi OS |
| `eno1` | placa integrada (firmware) | placa madre del equipo |
| `ens33` | ranura PCI (firmware) | típico de VMware |
| `enp0s3` | bus 0, ranura 3 del PCI | típico de VirtualBox: nuestras VM |
| `wlo1` / `wlp2s0` | Wi-Fi, nombre predecible | equipos con Wi-Fi |
| `wlan0` | Wi-Fi, nombre clásico | Raspberry Pi OS, `net.ifnames=0` |

> **Nota docente:** la regla está en [systemd.net-naming-scheme(7)](https://manpages.debian.org/trixie/systemd/systemd.net-naming-scheme.7.es.html): `o` es el índice de una placa integrada, `s` la ranura (slot) que informa el firmware, y `p` más `s` el bus y la ranura PCI (`enp0s3`: bus 0, ranura 3). Para Wi-Fi vale lo mismo con `wl`. systemd empezó a usarlos en la versión 197 ([Predictable Network Interface Names](https://systemd.io/PREDICTABLE_INTERFACE_NAMES/)). Debian los usa desde Debian 9 (wiki de Debian, *NetworkInterfaceNames*), Ubuntu lo documenta en su guía de redes (`eno1`, `enp0s25`) y Rocky hereda el esquema de RHEL (udev asigna nombres fijos según firmware, topología y ubicación). `eth0` aparece en contenedores Docker (la documentación de Docker lo muestra dentro del contenedor) y en WSL 2 (los reportes del repositorio de WSL). En Raspberry Pi OS lo usual es `eth0` y `wlan0`, y `raspi-config` permite activar los nombres predecibles; depende de la versión: se comprueba con `ip -br a`. `ens33` es el nombre típico de una placa de VMware, que le asigna la ranura PCI 33 (lo explican la documentación de Photon OS de VMware y la comunidad de Broadcom). Con `net.ifnames=0` en la línea de comandos del kernel se vuelve a `eth0`.

---

<a id="la_red_y_la_mascara"></a>

### La red y la máscara

Una red es el conjunto de equipos que se hablan directamente, sin pasar por un router. Las direcciones de una misma red comparten el comienzo.

La máscara dice cuánto del comienzo es la red. En `10.0.2.15/24`, el `/24` significa que los primeros 24 bits (`10.0.2`) identifican la red y el resto (`15`) identifica al equipo.

| Dirección | Red | Equipos posibles |
| --- | --- | --- |
| `10.0.2.15/24` | `10.0.2.0` | 254 (del `.1` al `.254`) |
| `192.168.50.10/24` | `192.168.50.0` | 254 |

Dos equipos con `/24` y el mismo comienzo (`192.168.50`) se ven directo. Con `192.168.51`, ya son redes distintas.

La `192.168.50.0` es la red interna del laboratorio, la que armamos [al final de la clase](#diseno_de_red_de_labs).

> **Nota docente:** `/24` equivale a `255.255.255.0`. No hacemos cuentas de subredes; alcanza con `/24` y con reconocer cuándo dos direcciones están en la misma red.

---

<a id="puerta_de_enlace_y_dns"></a>

### Puerta de enlace y DNS

Para hablar con un equipo de otra red, el paquete se entrega a la puerta de enlace (gateway): el router que conecta nuestra red con las demás. En la VM es `10.0.2.2`.

El DNS es el servicio que traduce nombres (`debian.org`) a direcciones. En la VM es `10.0.2.3`. Lo vemos con más detalle en la clase 19; hoy solo cómo lo usa el cliente.

Con [`ping`](https://manpages.debian.org/trixie/manpages-es/ping.8.es.html) comprobamos que la puerta de enlace responda:

```text
$ ping -c 3 10.0.2.2
64 bytes from 10.0.2.2: icmp_seq=1 ttl=64 time=0.447 ms
64 bytes from 10.0.2.2: icmp_seq=2 ttl=64 time=0.643 ms
64 bytes from 10.0.2.2: icmp_seq=3 ttl=64 time=0.778 ms
```

> **Nota docente:** salida recortada. `ping` manda un pedido y espera una respuesta; sirve para saber si hay camino. Lo vamos a usar todo el tiempo.

---

<a id="puertos"></a>

### Puertos

La IP identifica al equipo; el puerto, al servicio dentro del equipo, como el departamento en un edificio.

- Van del 0 al 65535. Del 1 al 1023 son los de servicios conocidos: en Linux solo root puede abrirlos.
- Cada número existe en TCP y en UDP. TCP abre una conexión y controla que todo llegue; UDP manda mensajes sueltos.

| Puerto | Protocolo | Servicio |
| --- | --- | --- |
| 22 | TCP | SSH |
| 53 | UDP y TCP | DNS |
| 67 y 68 | UDP | DHCP |
| 80 | TCP | web (HTTP) |
| 443 | TCP | web cifrada (HTTPS) |

Un servicio escucha en un puerto. Por eso anda el reenvío de la [clase 4](../clase4.html#/esquema_red): el 2222 de la laptop va al 22 de la VM.

> **Nota docente:** la lista completa de puertos conocidos está en `/etc/services`. Más adelante, `ss -tlnp` muestra TCP (la `t`) y `ss -ulnp` UDP (la `u`).

---

<a id="dhcp_o_direccion_fija"></a>

### DHCP o dirección fija

Dos maneras de que una interfaz tenga dirección:

- DHCP: un servicio de la red le reparte una. Es lo que hace la NAT de VirtualBox, y por eso `enp0s3` tiene `10.0.2.15` sin que hayamos escrito nada.
- Fija: la escribimos en la configuración.

Un servidor suele llevar dirección fija: otros equipos lo buscan siempre en el mismo lugar. Una dirección repartida por DHCP puede cambiar.

En una red interna de VirtualBox no hay servicio DHCP. Ahí la dirección fija hace falta.

---

<a id="direcciones_privadas_y_localhost"></a>

### Direcciones privadas y localhost

Hay rangos reservados para redes internas, que no se usan en Internet:

| Rango | Ejemplo |
| --- | --- |
| `10.0.0.0/8` | `10.0.2.15` |
| `172.16.0.0/12` | `172.16.10.12` |
| `192.168.0.0/16` | `192.168.50.10` |

Muchas casas y oficinas usan las mismas direcciones privadas porque cada red es aparte. Para salir a Internet, el router las traduce a una dirección pública (eso es NAT).

`127.0.0.1` es el propio equipo (`localhost`). Un servicio que escucha solo ahí no se alcanza desde afuera. Lo usamos al final de la clase.

---

<a id="la_tabla_de_ruteo"></a>

### La tabla de ruteo

El equipo decide por qué interfaz sale cada paquete mirando su tabla de ruteo, que se lee con [`ip route`](https://manpages.debian.org/trixie/iproute2/ip-route.8.es.html).

```text
$ ip route
default via 10.0.2.2 dev enp0s3 proto dhcp src 10.0.2.15 metric 1002
10.0.2.0/24 dev enp0s3 proto dhcp scope link src 10.0.2.15 metric 1002
```

- `10.0.2.0/24 dev enp0s3`: para esa red, salir directo por `enp0s3`.
- `default via 10.0.2.2`: para cualquier otro destino, entregarlo a la puerta de enlace. Es la ruta por defecto.

> **Nota docente:** `proto`, `scope` y `metric` se pasan por alto; `metric` sirve cuando hay dos rutas al mismo destino (la de menor valor gana). Un equipo tiene una sola ruta por defecto en condiciones normales.

---

<a id="consultas"></a>

### Consultas



---

<a id="ver_y_configurar_la_red"></a>

## Ver y configurar la red



---

<a id="leer_lo_que_hay"></a>

### Leer lo que hay

[`ip a`](https://manpages.debian.org/trixie/iproute2/ip-address.8.es.html) muestra el detalle de cada interfaz:

```text
$ ip a
2: enp0s3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 08:00:27:c6:71:ba brd ff:ff:ff:ff:ff:ff
    inet 10.0.2.15/24 brd 10.0.2.255 scope global dynamic noprefixroute enp0s3
       valid_lft 86370sec preferred_lft 75570sec
3: enp0s8: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN group default qlen 1000
    link/ether 08:00:27:87:01:11 brd ff:ff:ff:ff:ff:ff
```

- `state UP` o `DOWN`: la interfaz está encendida o apagada.
- `link/ether`: la dirección física (MAC) de la placa.
- `inet`: la dirección IPv4. `dynamic` dice que vino por DHCP.
- `enp0s8` es la placa nueva (la segunda, en la red interna del laboratorio): sin `inet` y `DOWN`.

> **Nota docente:** salida recortada (se sacó `lo` y las líneas IPv6). `ip -br a` es lo que usamos en el día a día; `ip a` para ver el detalle. `ip link` muestra solo las interfaces, sin direcciones.

---

<a id="las_rutas_y_la_ruta_hacia_un_destino"></a>

### Las rutas y la ruta hacia un destino

```text
$ ip route get 8.8.8.8
8.8.8.8 via 10.0.2.2 dev enp0s3 src 10.0.2.15 uid 1000
    cache
```

[`ip route get`](https://manpages.debian.org/trixie/iproute2/ip-route.8.es.html) pregunta cómo saldría un paquete hacia un destino: por qué interfaz y por qué puerta de enlace. Es la mejor pregunta cuando algo no llega.

Lo vamos a usar en el diagnóstico.

---

<a id="cambios_temporales"></a>

### Cambios temporales

```text
$ sudo ip addr add 192.168.50.10/24 dev enp0s8
$ sudo ip link set enp0s8 up
$ ip -br -4 a
lo               UNKNOWN        127.0.0.1/8
enp0s3           UP             10.0.2.15/24
enp0s8           UP             192.168.50.10/24
```

- [`ip addr add`](https://manpages.debian.org/trixie/iproute2/ip-address.8.es.html) pone la dirección y [`ip link set up`](https://manpages.debian.org/trixie/iproute2/ip-link.8.es.html) enciende la interfaz. La ruta a `192.168.50.0/24` aparece sola.
- No quedan guardados en ningún archivo: al reiniciar se pierden.
- `sudo ip addr del 192.168.50.10/24 dev enp0s8` la quita, y `enp0s8` deja de aparecer en `ip -br -4 a`.

Sirve para probar. Para que quede, hay que escribir la configuración.

> **Nota docente:** salida real de la VM Debian (`validacion/ip-4-2026-11-01.txt`). `enp0s8` es la segunda placa, en la red interna `redcurso`; se agrega en el laboratorio.

---

<a id="debian_archivo_de_configuracion"></a>

### Debian: archivo de configuración

En Debian la red la arma `ifupdown` y se configura en texto plano, en [`/etc/network/interfaces`](https://manpages.debian.org/trixie/ifupdown/interfaces.5.es.html).

```text
# /etc/network/interfaces (el que viene en la VM)
source /etc/network/interfaces.d/*

allow-hotplug enp0s3
iface enp0s3 inet dhcp
```

```text
# /etc/network/interfaces.d/enp0s8  (dirección fija, en un archivo propio)
auto enp0s8
iface enp0s8 inet static
    address 192.168.50.10/24
```

- `auto`: se levanta al arrancar.
- `inet static` y `address`: dirección fija, con la máscara.
- Sin `gateway`: la salida sigue siendo por `enp0s3`.

> **Nota docente:** salida del `interfaces` recortada (sin la interfaz `lo` ni las líneas de IPv6). La línea `source` es la que lee `interfaces.d/`. Si alguien pone un `gateway` en cada interfaz, queda con dos rutas por defecto: sin una salida clara.

---

<a id="levantar_y_bajar_interfaces"></a>

### Levantar y bajar interfaces

```text
$ sudo ifup enp0s8
$ ip -br -4 a
enp0s8           DOWN           192.168.50.10/24
$ ip -br -4 a   # unos segundos después
enp0s8           UP             192.168.50.10/24
```

- [`ifup`](https://manpages.debian.org/trixie/ifupdown/ifup.8.es.html) levanta la interfaz con lo que dice el archivo. No imprime nada si anda bien.
- Justo después puede verse `DOWN`: el enlace tarda 2 o 3 segundos en subir. Esperar antes de dar la configuración por fallida.
- Para cambiarla: primero [`ifdown`](https://manpages.debian.org/trixie/ifupdown/ifdown.8.es.html), después editar, y por último `ifup`. Si se edita antes, `ifdown` da `Error: ipv4: Address not found.`

---

<a id="un_riesgo_reiniciar_la_red"></a>

### Un riesgo: reiniciar la red

```text
$ sudo systemctl restart networking
$ ip -br a
enp0s3           UP             fd17:625c:f037:2:d6c7:d927:be43:d878/64 fe80::364:3345:a464:8e46/64
```

Con [`systemctl restart networking`](https://manpages.debian.org/trixie/systemd/systemctl.1.es.html), durante unos segundos `enp0s3` queda sin IPv4 y sin ruta por defecto, hasta que el DHCP renueva. En un servidor remoto, la sesión SSH se puede cortar.

Para una dirección fija nueva alcanza con `ifup` de esa interfaz. Reiniciar `networking` afecta a todas.

Después de reiniciar el equipo, la dirección fija sigue ahí: el archivo manda.

> **Nota docente:** la salida es de la prueba, tomada justo después del reinicio del servicio. En la VM la sesión por NAT sobrevivió, pero no hay garantía. En la clase 10 vimos que `restart` corta lo que el servicio estaba haciendo; con `networking`, lo que se corta es la red por la que entramos.

---

<a id="ubuntu_netplan"></a>

### Ubuntu: netplan

Ubuntu Server no usa `/etc/network/interfaces`. Usa [`netplan`](https://manpages.debian.org/trixie/netplan.io/netplan.8.en.html): un archivo YAML en `/etc/netplan/` que describe la red. De ahí netplan genera la configuración para el servicio que la aplica (`systemd-networkd` o `NetworkManager`).

```text
# /etc/netplan/01-estatica.yaml  (ejemplo de Ubuntu)
network:
  version: 2
  ethernets:
    enp0s3:
      addresses:
        - 192.168.1.50/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 192.168.1.1
          - 8.8.8.8
```

> **Nota docente:** es lo que se encuentra en Ubuntu; en Debian y en Rocky no lo usamos. El ejemplo se validó con `netplan generate` en Ubuntu 26.04 (netplan 1.2), sin aplicarlo. En Ubuntu Desktop, NetworkManager guarda cada conexión como un YAML de netplan (`/etc/netplan/90-NM-<uuid>.yaml`): netplan está aunque nadie lo haya escrito a mano.

---

<a id="netplan_probar_y_aplicar"></a>

### Netplan: probar y aplicar

```bash
sudo netplan try
sudo netplan apply
```

- [`netplan try`](https://manpages.debian.org/trixie/netplan.io/netplan-try.8.en.html) aplica la configuración y la deshace sola si no se confirma en 120 segundos. Útil en un servidor remoto: si se corta la conexión, vuelve atrás.
- [`netplan apply`](https://manpages.debian.org/trixie/netplan.io/netplan-apply.8.en.html) la aplica definitivamente.
- El YAML se escribe con espacios. Con un tabulador, netplan saltea el archivo:

```text
Invalid YAML: tabs are not allowed for indent
```

- El archivo va con permisos `600`; si otros lo pueden leer, netplan avisa.

> **Nota docente:** solo teoría, no hay práctica de netplan. En archivos viejos aparece `gateway4:`; netplan lo acepta con el aviso `` `gateway4` has been deprecated, use default routes instead`` y hoy se escribe `routes:` con `to: default`. Mensajes tomados de la prueba en el anfitrión (`validacion/netplan-anfitrion-2026-10-30.txt`).

---

<a id="rocky_networkmanager"></a>

### Rocky: NetworkManager

En Rocky la red la maneja NetworkManager. Cada configuración es un perfil, un archivo en `/etc/NetworkManager/system-connections/`, y [`nmcli`](https://manpages.debian.org/trixie/network-manager/nmcli.1.es.html) es la herramienta para crearlos y verlos.

```text
$ nmcli device
DEVICE  TYPE      STATE                   CONNECTION
enp0s3  ethernet  conectado               enp0s3
enp0s8  ethernet  conectado               interna
lo      loopback  connected (externally)  lo
```

- `nmcli device`: las interfaces y qué perfil usa cada una.
- `nmcli con show`: los perfiles.
- Con una placa nueva, NetworkManager arma solo un perfil «Conexión cableada 1» con DHCP. En una red interna no hay DHCP: queda en «conectando» sin dirección hasta que creamos uno propio.

El perfil se puede crear con `nmcli` o con [`nmtui`](https://manpages.debian.org/trixie/network-manager/nmtui.1.en.html), que es el mismo NetworkManager con menús.

> **Nota docente:** el estado «conectando (obteniendo configuración IP)» de la placa nueva está registrado y es lo que van a ver los alumnos antes de crear `interna`. El perfil automático vive en `/run`, no en disco, y desaparece al reiniciar.

---

<a id="rocky_configuracion_con_menus"></a>

### Rocky: configuración con menús

[`nmtui`](https://manpages.debian.org/trixie/network-manager/nmtui.1.en.html) arma el perfil con menús en la terminal, sin tener que recordar las opciones de [`nmcli`](https://manpages.debian.org/trixie/network-manager/nmcli.1.es.html). Se usa con `sudo`. En el laboratorio, Rocky se configura con `nmtui`.

![nmtui: perfil interna en enp0s8, IPv4 manual con 192.168.50.20/24 y sin puerta de enlace](img/c17/nmtui-05-formulario-ipv4.png)

- Tab y flechas para moverse, Enter para elegir, Espacio para marcar.
- Al aceptar, NetworkManager guarda el perfil en `/etc/NetworkManager/system-connections/` y lo activa.
- Lo que hace `nmtui` se ve igual con `nmcli con show`.

> **Nota docente:** captura de la VM Rocky 9.8 en español. `NetworkManager-tui` ya viene instalado. Sin `sudo`, al aceptar sale «Insufficient privileges» y no guarda.

---

<a id="donde_se_configura_la_red"></a>

### Dónde se configura la red

|  | Debian | Ubuntu | Rocky |
| --- | --- | --- | --- |
| Quién maneja la red | ifupdown | netplan sobre systemd-networkd o NetworkManager | NetworkManager |
| Dónde se escribe | `/etc/network/interfaces` y `interfaces.d/` | `/etc/netplan/*.yaml` | `/etc/NetworkManager/system-connections/` |
| Cómo se aplica | [`ifup`](https://manpages.debian.org/trixie/ifupdown/ifup.8.es.html) / [`ifdown`](https://manpages.debian.org/trixie/ifupdown/ifdown.8.es.html) | [`netplan try`](https://manpages.debian.org/trixie/netplan.io/netplan-try.8.en.html) / [`netplan apply`](https://manpages.debian.org/trixie/netplan.io/netplan-apply.8.en.html) | [`nmcli con up`](https://manpages.debian.org/trixie/network-manager/nmcli.1.es.html) o [`nmtui`](https://manpages.debian.org/trixie/network-manager/nmtui.1.en.html) |

Lo mismo en cada caso: una dirección, una máscara y, si hace falta, una puerta de enlace y un DNS.

---

<a id="consultas_3"></a>

### Consultas



---

<a id="nombres_del_lado_del_cliente"></a>

## Resolución de nombres de host

Cómo el equipo traduce el nombre de otro equipo a su dirección IP.

---

<a id="archivos_de_resolucion"></a>

### Archivos de resolución

Podemos usar nombres de equipo en lugar de direcciones IP. El sistema los traduce con estos archivos.

- [`/etc/hosts`](https://manpages.debian.org/trixie/manpages-es/hosts.5.es.html): una libreta local. Una línea por equipo: dirección y nombre. `rocky` es la otra VM, en la [red interna](#diseno_de_red_de_labs).
- [`/etc/resolv.conf`](https://manpages.debian.org/trixie/manpages/resolv.conf.5.es.html): a qué servidores DNS preguntar. En la VM lo escribe [`dhcpcd`](https://manpages.debian.org/trixie/dhcpcd-base/dhcpcd.8.en.html) (en Rocky, NetworkManager).

```text
$ cat /etc/hosts
127.0.0.1	localhost
127.0.1.1	lab2-vm
192.168.50.20 rocky
```

```text
$ cat /etc/resolv.conf
# Generated by dhcpcd from enp0s3.dhcp, enp0s3.ra
domain lan
nameserver 10.0.2.3
```

> **Nota docente:** salida recortada (se sacaron líneas de comentarios y de IPv6 de `/etc/hosts`). La línea `192.168.50.20 rocky` es la que se agrega en el laboratorio. `resolv.conf` se vuelve a escribir cuando dhcpcd renueva o se reinicia la red: una edición a mano no es duradera.

---

<a id="probar_la_resolucion"></a>

### Probar la resolución

El sistema consulta primero `/etc/hosts` y después el DNS. Una entrada en `/etc/hosts` gana sobre el DNS.

```text
$ getent hosts rocky
192.168.50.20   rocky
$ ping -c 2 rocky
PING rocky (192.168.50.20) 56(84) bytes of data.
64 bytes from rocky (192.168.50.20): icmp_seq=1 ttl=64 time=1.24 ms
```

[`getent hosts`](https://manpages.debian.org/trixie/manpages/getent.1.es.html) resuelve un nombre igual que lo hacen los programas. Si no imprime nada, el nombre no se resuelve.

[`dig`](https://manpages.debian.org/trixie/bind9-dnsutils/dig.1.en.html) y [`host`](https://manpages.debian.org/trixie/bind9-host/host.1.en.html) hacen consultas DNS directas: los vemos en la clase 19.

> **Nota docente:** el orden lo fija la línea `hosts: files dns` de `/etc/nsswitch.conf`: primero `files` (`/etc/hosts`), después `dns`. No se muestra en las diapositivas; si preguntan, es ahí donde se cambia.

---

<a id="consultas_4"></a>

### Consultas



---

<a id="diagnostico"></a>

## Diagnóstico



---

<a id="el_orden_de_abajo_hacia_arriba"></a>

### El orden: de abajo hacia arriba

Cuando un equipo no llega a un destino, se revisa por capas. Cada una depende de la anterior:

1. La interfaz está arriba: [`ip -br a`](https://manpages.debian.org/trixie/iproute2/ip-address.8.es.html).
2. Tiene dirección: `ip -br a`.
3. Hay ruta hacia el destino: [`ip route get`](https://manpages.debian.org/trixie/iproute2/ip-route.8.es.html).
4. Llega a la puerta de enlace: [`ping 10.0.2.2`](https://manpages.debian.org/trixie/manpages-es/ping.8.es.html).
5. Llega a una IP externa: `ping 8.8.8.8`.
6. Resuelve el nombre: [`getent hosts debian.org`](https://manpages.debian.org/trixie/manpages/getent.1.es.html).

Se busca el primer paso que falla.

---

<a id="comprobar_que_se_llegue_al_host"></a>

### Comprobar que se llegue al host

[`ping`](https://manpages.debian.org/trixie/manpages-es/ping.8.es.html) manda un pedido a otro equipo y espera la respuesta: si vuelve, hay camino. `-c 3` manda tres pedidos y termina.

```text
$ ping -c 3 8.8.8.8
64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=11.7 ms
...
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
```

```text
$ ping -c 3 debian.org
64 bytes from 151.101.130.132: icmp_seq=1 ttl=59 time=20.7 ms
...
3 packets transmitted, 3 received, 0% packet loss, time 2004ms
```

Con la IP y con el nombre responde: la red anda. Cuando falla, el mensaje de `ping` a veces engaña. El que no engaña es [`ip route get`](https://manpages.debian.org/trixie/iproute2/ip-route.8.es.html): dice por dónde sale el paquete.

> **Nota docente:** salidas recortadas. Si el `ping` por IP anda y el del nombre no, el problema es la resolución, no la red.

---

<a id="interfaz_caida_o_red_equivocada"></a>

### Interfaz caída o red equivocada

Desde Debian, [`ping 192.168.50.20`](https://manpages.debian.org/trixie/manpages-es/ping.8.es.html) no llega (es la VM Rocky, en la red interna). Dos causas distintas dan el mismo síntoma:

```text
$ ping -c 3 -W 2 192.168.50.20
From 172.16.10.12 icmp_seq=1 Destination Port Unreachable
3 packets transmitted, 0 received, +1 errors, 100% packet loss
```

`-c 3` manda tres pedidos y `-W 2` espera hasta 2 segundos cada respuesta.

Esa dirección (`172.16.10.12`) no es de las VM: es de un router de afuera. El mensaje no dice qué falló. La pista está en la ruta, con [`ip route get`](https://manpages.debian.org/trixie/iproute2/ip-route.8.es.html):

```text
$ ip route get 192.168.50.20
192.168.50.20 via 10.0.2.2 dev enp0s3 src 10.0.2.15 uid 1000
```

Sale por la NAT (`enp0s3`) y no por la red interna (`enp0s8`). Falta la ruta a `192.168.50.0/24`.

---

<a id="por_que_falta_la_ruta"></a>

### ¿Por qué falta la ruta?

Se mira [`ip -br a`](https://manpages.debian.org/trixie/iproute2/ip-address.8.es.html):

| `ip -br a` muestra | Causa |
| --- | --- |
| `enp0s8  DOWN  192.168.50.10/24` o sin dirección | interfaz caída: [`ifup enp0s8`](https://manpages.debian.org/trixie/ifupdown/ifup.8.es.html) |
| `enp0s8  UP  192.168.51.10/24` | red equivocada: corregir el archivo |

> **Nota docente:** estas dos fallas son del laboratorio. En la caída con `ip link set down` la dirección queda; con `ifdown` se pierde. En las dos, la ruta a la red interna desaparece de `ip route`. En la red equivocada la placa está arriba, pero en otra red: `192.168.51.0/24`.

---

<a id="el_nombre_no_resuelve"></a>

### El nombre no resuelve

El [`ping`](https://manpages.debian.org/trixie/manpages-es/ping.8.es.html) por IP anda y el del nombre no: la red está bien y falla la resolución.

```text
$ getent hosts rocky
$ echo $?
2
$ ping -c 3 rocky
ping: rocky: Fallo temporal en la resolución del nombre
$ ping -c 2 192.168.50.20
64 bytes from 192.168.50.20: icmp_seq=1 ttl=64 time=1.48 ms
```

- Un nombre que falta en `/etc/hosts` falla enseguida.
- Un `nameserver` equivocado: `ping debian.org` falla en unos 5 segundos y `ping 8.8.8.8` anda.
- Un `nameserver` que no contesta: [`getent hosts`](https://manpages.debian.org/trixie/manpages/getent.1.es.html) tarda unos 12 segundos en rendirse. Si un comando se queda colgado antes de fallar, sospechar del DNS.

Se revisa `/etc/hosts` y `/etc/resolv.conf`.

> **Nota docente:** si el nombre sigue sin resolver con los dos archivos bien, queda mirar el orden de consulta en `/etc/nsswitch.conf` (`hosts: files dns`). Con `LANG=C` el mensaje sale `Temporary failure in name resolution`. Con la IP mal escrita en `/etc/hosts` (`192.168.50.21 rocky`), `getent` devuelve esa IP equivocada y el ping da `Destination Host Unreachable` desde la propia dirección: el nombre sí resolvió, a otra cosa.

---

<a id="los_saltos_hasta_el_destino"></a>

### Los saltos hasta el destino

[`traceroute`](https://manpages.debian.org/trixie/traceroute/traceroute.1.es.html) muestra los saltos que da un paquete hasta el destino: cada router por el que pasa.

```text
$ traceroute -n 8.8.8.8
traceroute to 8.8.8.8 (8.8.8.8), 30 hops max, 60 byte packets
 1  10.0.2.2  0.390 ms  0.290 ms  0.365 ms
 2  172.16.10.1  4.239 ms  4.017 ms  3.991 ms
 3  192.168.100.1  3.868 ms  3.778 ms  3.696 ms
 ...
 9  8.8.8.8  8.794 ms  9.199 ms  7.866 ms
```

El primer salto es la NAT de VirtualBox; los siguientes son de la red del anfitrión. Un `* * *` es un salto que no contesta.

No siempre viene instalado. Debian y Ubuntu: [`sudo apt install traceroute`](https://manpages.debian.org/trixie/apt/apt.8.es.html). Rocky: [`sudo dnf install traceroute`](https://dnf.readthedocs.io/en/latest/command_ref.html); ahí viene [`tracepath`](https://manpages.debian.org/trixie/iputils-tracepath/tracepath.8.en.html), parecido.

> **Nota docente:** salida recortada, tomada en la red del docente; no es reproducible.

---

<a id="consultas_5"></a>

### Consultas



---

<a id="que_escucha_y_donde"></a>

## Qué escucha y dónde



---

<a id="que_servicios_escuchan"></a>

### Qué servicios escuchan

Cada servicio que escucha es una puerta abierta a la red. [`ss`](https://manpages.debian.org/trixie/iproute2/ss.8.es.html) muestra cuáles.

```text
$ ss -tlnp
State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process
LISTEN 0      128          0.0.0.0:22        0.0.0.0:*
LISTEN 0      128             [::]:22           [::]:*
```

- `-t` TCP, `-l` los que escuchan, `-n` números en lugar de nombres, `-p` el proceso (con `sudo`).
- `Local Address`: en qué dirección escucha. `0.0.0.0` es todas las interfaces.
- Solo sshd, en el puerto 22.

`ss -ulnp` hace lo mismo para UDP: ahí aparecen los clientes DHCP.

> **Nota docente:** salida de `ss -tlnp` sin `sudo`, por eso falta la columna `Process`. `[::]` es el equivalente de `0.0.0.0` para IPv6.

---

<a id="local_o_todas_las_interfaces"></a>

### Local o todas las interfaces

Un servicio de prueba, en Debian, con [`python3 -m http.server`](https://manpages.debian.org/trixie/python3-minimal/python3.1.en.html):

```text
$ python3 -m http.server 8080 --bind 127.0.0.1
$ ss -tlnp | grep 8080
LISTEN 0      5          127.0.0.1:8080      0.0.0.0:*    users:(("python3",pid=1430,fd=3))
```

Desde Rocky, con [`curl`](https://manpages.debian.org/trixie/curl/curl.1.es.html):

```text
$ curl http://192.168.50.10:8080/
curl: (7) Failed to connect to 192.168.50.10 port 8080: Conexión rehusada
```

Se vuelve a lanzar con `--bind 0.0.0.0`:

```text
LISTEN 0      5            0.0.0.0:8080      0.0.0.0:*    users:(("python3",pid=1453,fd=3))
$ curl -s -o /dev/null -w '%{http_code}\n' http://192.168.50.10:8080/
200
```

Misma aplicación y mismo puerto: solo cambia la dirección en que escucha.

> **Nota docente:** Debian no trae `curl`; se usa desde Rocky. Después se corta el servidor con `Ctrl+C`.

---

<a id="escuchar_solo_donde_hace_falta"></a>

### Escuchar solo donde hace falta

- Si un servicio es solo para el propio equipo, que escuche en `127.0.0.1`.
- Si es para una red interna, en la dirección de esa interfaz.
- Un servicio que no se usa se apaga y se deshabilita ([clase 10](../clase10.html#/servicios_con_systemd)).

`sshd` escucha en todas las interfaces (`0.0.0.0:22`). En la clase 18 vemos cómo ajustarlo.

---

<a id="consultas_6"></a>

### Consultas



---

<a id="la_red_del_laboratorio"></a>

## La red del laboratorio



---

<a id="los_modos_de_red_de_virtualbox"></a>

### Los modos de red de VirtualBox

La [clase 2](../clase2.html#/modos_red) presentó la tabla de modos: NAT, red NAT, puente, red interna y host-only.

También planteó como esquema fijo una placa NAT más una host-only. Desde la [clase 4](../clase4.html#/esquema_red) trabajamos con una sola placa NAT y el reenvío de puertos, que alcanzó para llegar por SSH.

Hoy hace falta que las dos VM se vean entre sí. La NAT no lo permite. Para eso sumamos una segunda placa en modo red interna.

> **Nota docente:** decirlo con naturalidad: lo de la clase 2 era una primera propuesta y el curso fue por otro camino. No cambia nada de lo que ya hicieron; se agrega una placa.

---

<a id="diseno_de_red_de_labs"></a>

### Diseño de red de labs

![Diseño de red de los labs: el anfitrión llega a cada VM por su NAT (2222 a Debian, 2223 a Rocky); cada VM tiene enp0s3 en NAT con 10.0.2.15 y enp0s8 en la red interna redcurso, 192.168.50.10 y 192.168.50.20](img/c17/red-labs.svg)

- La primera placa sigue en NAT: Internet y SSH, como siempre.
- La segunda placa va a una red interna: solo se ven las VM que estén en ella.
- Crear la red y agregar la placa se hace en VirtualBox, en el laboratorio.

> **Nota docente:** diagrama en `img/red-labs.svg`, con versión oscura `img/red-labs-oscuro.svg`, como los de la clase 13. «gw» es la puerta de enlace. En el HTML se copian a `linux410/img/c17/`.

---

<a id="dos_vm_con_la_misma_direccion"></a>

### Dos VM con la misma dirección

Las dos VM tienen `10.0.2.15` en la NAT y no chocan: cada NAT de VirtualBox es una red aparte, que solo conoce su VM.

Por eso tampoco se ven entre sí por ahí.

La red interna es una red común para las dos, y ahí cada una necesita una dirección propia. No hay DHCP, así que van fijas: `192.168.50.10` para Debian y `192.168.50.20` para Rocky.

---

<a id="consultas_2"></a>

### Consultas



---

<a id="resumen"></a>

### Resumen

- Una interfaz tiene dirección, máscara y, hacia afuera, una puerta de enlace.
- [`ip a`](https://manpages.debian.org/trixie/iproute2/ip-address.8.es.html), [`ip route`](https://manpages.debian.org/trixie/iproute2/ip-route.8.es.html) e `ip route get` leen la red; `ip addr add` es temporal.
- Debian: `/etc/network/interfaces.d/` con [`ifup`](https://manpages.debian.org/trixie/ifupdown/ifup.8.es.html) e [`ifdown`](https://manpages.debian.org/trixie/ifupdown/ifdown.8.es.html). Ubuntu: [`netplan`](https://manpages.debian.org/trixie/netplan.io/netplan.8.en.html). Rocky: [`nmcli`](https://manpages.debian.org/trixie/network-manager/nmcli.1.es.html) o [`nmtui`](https://manpages.debian.org/trixie/network-manager/nmtui.1.en.html).
- `/etc/hosts` se consulta antes que el DNS.
- Diagnóstico por capas: interfaz, dirección, ruta, puerta de enlace, IP externa, nombre. [`ss -tlnp`](https://manpages.debian.org/trixie/iproute2/ss.8.es.html) dice qué escucha y dónde.

---

<a id="labs"></a>

## Actividades prácticas y laboratorios



---

<a id="labs_clase"></a>

### Actividad práctica: Laboratorio 16

- Agregar la red interna y la segunda placa a cada VM.
- Dirección fija en Debian (`interfaces.d`) y en Rocky ([`nmtui`](https://manpages.debian.org/trixie/network-manager/nmtui.1.en.html)); comprobar que sobrevive al reinicio.
- [`ping`](https://manpages.debian.org/trixie/manpages-es/ping.8.es.html) entre las VM y nombres en `/etc/hosts`.
- Tres fallas para diagnosticar con el orden de la clase.
- [`ss -tlnp`](https://manpages.debian.org/trixie/iproute2/ss.8.es.html) en las dos VM.

[Laboratorio 16: Redes](https://github.com/kity-linuxero/linux410-labs/blob/main/lab16/lab16.md)

> **Nota docente:** el laboratorio todavía no está escrito; la ruta es la prevista según el mapa de repositorios. Sin depender de laboratorios anteriores: solo Debian con SSH y la OVA de Rocky.

---

<a id="referencias"></a>

### Referencias

- Ayuda local: [`man interfaces`](https://manpages.debian.org/trixie/ifupdown/interfaces.5.es.html), [`man ip`](https://manpages.debian.org/trixie/iproute2/ip.8.en.html), [`man nmcli`](https://manpages.debian.org/trixie/network-manager/nmcli.1.es.html), [`man nmtui`](https://manpages.debian.org/trixie/network-manager/nmtui.1.en.html), [`man netplan-try`](https://manpages.debian.org/trixie/netplan.io/netplan-try.8.en.html), [`man ss`](https://manpages.debian.org/trixie/iproute2/ss.8.es.html).
- Nombres de interfaces: [systemd.net-naming-scheme(7)](https://manpages.debian.org/trixie/systemd/systemd.net-naming-scheme.7.es.html) y [Predictable Network Interface Names](https://systemd.io/PREDICTABLE_INTERFACE_NAMES/).
- [Netplan: ejemplos](https://netplan.readthedocs.io/en/stable/examples/).
