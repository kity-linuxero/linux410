<a id="inicio"></a>
# Administración de servidores GNU/Linux

## Clase 8: Usuarios, grupos e identidad

Módulo 1 — Operación de Sistemas Operativos GNU/Linux

---

<a id="index"></a>
### Temas de la clase 8

- [Identidad: UID, GID, root y sudo](#identidad_en_linux)
- [Archivos de cuentas y consultas con getent](#la_base_de_datos_de_cuentas)
- [Usuarios, grupos y sesiones](#usuarios_grupos_y_sesiones)
- [Cuentas de servicio y menor privilegio](#cuentas_de_servicio)
- [Permisos tradicionales de Unix y UGO](#permisos_tradicionales_de_unix)
- [Actividad práctica](#labs_clase)

---

<a id="objetivos"></a>
### Objetivos de la clase

Al finalizar esta clase vas a poder:

- Explicar cómo identifica Linux a un usuario y a un grupo.
- Distinguir la función de `/etc/passwd`, `/etc/shadow` y `/etc/group`.
- Reconocer las herramientas para crear cuentas y administrar pertenencias.
- Diferenciar los grupos registrados para una cuenta de los grupos de una sesión existente.
- Interpretar la identidad asociada a un archivo y sus permisos básicos.

> Venimos navegando, leyendo y editando archivos. Ahora vamos a entender cómo se relacionan las cuentas con el acceso a esos archivos. La aplicación de estos conceptos se realiza en el laboratorio 8.

---

<a id="algo_que_venimos_usando"></a>
### Algo que venimos usando

```bash
ls -l /etc/hosts
```

```text
-rw-r--r-- 1 root root 221 sep 16 10:12 /etc/hosts
```

**Owner significa propietario: es el usuario al que pertenece el archivo.** De aquí en adelante lo llamaremos **owner**.

Hasta ahora miramos principalmente el nombre, la fecha y el tamaño. Hoy vamos a interpretar también **el tipo, el owner, el grupo y los permisos**.

---

<a id="identidad_en_linux"></a>
## Identidad en Linux

El sistema trabaja con números y nos muestra nombres

---

<a id="reconocer_la_sesion_en_el_prompt"></a>
### Reconocer la sesión en el prompt

El prompt, según cómo esté configurado, puede mostrar el usuario y el equipo:

```text
usuario@hostname:~$
```

Podemos confirmar la identidad con comandos.

---

<a id="quien_sos_para_el_sistema"></a>
### Quién sos para el sistema

Comandos para saber quiénes somos:

```bash
whoami
id
```

```text
uid=1000(cristian) gid=1000(cristian) groups=1000(cristian),27(sudo)
```

- **UID:** identificador del usuario.
- **GID:** identificador del grupo principal de la sesión.
- **Grupos suplementarios:** otras pertenencias de esa sesión.

`groups` también permite consultar los grupos. En la salida de `id`, la lista `groups` incluye el principal.

> Estar en el grupo `sudo` permite solicitar las acciones autorizadas por su configuración. La cuenta sigue siendo un usuario común mientras no eleva privilegios.

---

<a id="repaso_root_y_sudo"></a>
### Repaso: root y sudo

- **root** es la cuenta administrativa, con UID `0`.
- **sudo** permite ejecutar un comando como otro usuario, normalmente root, según las autorizaciones configuradas.
- Tener permiso para usar sudo no convierte nuestra cuenta en root.

```bash
whoami       # cristian
sudo whoami  # root
whoami       # cristian
```

> Para comprobar qué puede hacer Ana o Bruno, probamos con su identidad, sin elevar privilegios.

---

<a id="numeros_y_nombres"></a>
### Números y nombres

Los archivos almacenan el UID de su owner y un GID. Los programas consultan las bases de datos del sistema para mostrar los nombres correspondientes.

Si se elimina una cuenta, un archivo puede conservar su UID aunque ya no exista un nombre que mostrar. Eliminar la cuenta no transfiere automáticamente sus archivos a otro usuario.

```bash
ls -l /etc/hosts
ls -ln /etc/hosts
```

`-n` muestra UID y GID sin traducirlos a nombres.

> **Nota docente:** comparar estas dos salidas y localizar lo que cambia:

---

<a id="rangos_habituales_de_uid"></a>
### Rangos habituales de UID

- UID `0` corresponde a root.
- En Debian son habituales los UID bajos para cuentas de sistema.
- Las cuentas comunes creadas con `adduser` suelen empezar en `1000`.

Los rangos son convenciones configurables. **El número por sí solo no demuestra si una cuenta corresponde a una persona o a un servicio.**

---

<a id="consultas"></a>
### Consultas

UID → GID → nombres → identidad de la sesión

---

<a id="la_base_de_datos_de_cuentas"></a>
## La base de datos de cuentas

Qué contiene cada archivo y para qué se consulta

---

<a id="etc_passwd_datos_de_la_cuenta"></a>
### Datos de la cuenta

`/etc/passwd` · campos separados por `:`

```text
cristian:x:1000:1000:Cristian,,,:/home/cristian:/bin/bash
```

| Valor | Significado |
| --- | --- |
| `cristian` | Nombre de la cuenta. |
| `x` | Información de contraseña en `/etc/shadow`. |
| `1000` | UID. |
| `1000` | GID del grupo principal. |
| `Cristian,,,` | Descripción. |
| `/home/cristian` | Directorio personal. |
| `/bin/bash` | Intérprete de la cuenta. |

El grupo principal de la cuenta se identifica en este archivo, mediante su GID.

---

<a id="etc_shadow_informacion_de_contrasena"></a>
### Información de contraseña

`/etc/passwd` es normalmente legible por los usuarios. `/etc/shadow` restringe el acceso a la información de contraseñas y su vigencia.

Shadow puede guardar un **hash**, que permite verificar una contraseña. No es la contraseña en texto legible ni un cifrado que se descifre para recuperarla.

```text
ana:$y$...:20347:0:99999:7:::
```

Esta línea es ficticia. Nos interesa entender la función del archivo, sin memorizar todos sus campos.

> Restringir la lectura del hash reduce su exposición a intentos de adivinación fuera del sistema. También importan el algoritmo y la fortaleza de la contraseña.

---

<a id="estados_de_una_contrasena"></a>
### Estados de una contraseña

| Campo en shadow | Qué permite concluir |
| --- | --- |
| Hash válido, por ejemplo con prefijo `$y$` | Hay un hash utilizable para verificar la contraseña. |
| Comienza con `!` | La contraseña está bloqueada. |
| `*` | No es un hash válido para autenticarse con contraseña; no describe la historia de la cuenta. |
| Vacío | No hay contraseña; la aceptación del ingreso depende del mecanismo de autenticación y su política. |

**Bloquear una contraseña no equivale a deshabilitar todas las formas de acceso.** Una clave SSH podría seguir permitiendo el ingreso según la configuración.

`passwd -S` consulta el estado sin mostrar el hash: `L` indica contraseña bloqueada, `P` contraseña utilizable y `NP` ausencia de contraseña.

---

<a id="etc_group_datos_del_grupo"></a>
### Datos del grupo

`/etc/group` · campos separados por `:`

```text
sudo:x:27:cristian
```

| Valor | Significado |
| --- | --- |
| `sudo` | Nombre del grupo. |
| `x` | Marcador del campo de contraseña de grupo; no lo administramos en esta clase. |
| `27` | GID. |
| `cristian` | Miembros suplementarios registrados. |

La pertenencia por grupo principal **no necesita aparecer en esta lista**. No encontrar allí un nombre no alcanza para concluir que no pertenece al grupo.

---

<a id="consultar_con_getent"></a>
### Consultar con `getent`

```bash
getent passwd cristian
getent group sudo
```

`getent` consulta las fuentes de cuentas configuradas en el sistema. En nuestra VM son locales; en otro servidor pueden incluir un directorio central.

| Consulta | Alcance |
| --- | --- |
| Leer `/etc/passwd` | Contenido del archivo local. |
| `getent passwd usuario` | Entrada de la cuenta en las fuentes configuradas. |
| `getent group grupo` | Entrada del grupo en las fuentes configuradas. |

El comando `getent` nos puede servir como alternativa al clásico `grep usuario /etc/passwd`, por ejempo.

---

<a id="consultas_2"></a>
### Consultas

`passwd`: cuenta → `shadow`: contraseña → `group`: grupo → `getent`: consulta

---

<a id="usuarios_grupos_y_sesiones"></a>
## Usuarios, grupos y sesiones

Una cuenta puede pertenecer a varios grupos

---

<a id="grupo_principal_y_suplementarios"></a>
### Grupo principal y suplementarios

- La cuenta tiene un grupo principal configurado.
- Puede pertenecer además a grupos suplementarios.
- Ambos intervienen en el acceso por grupo.
- Habitualmente, un archivo nuevo recibe el grupo efectivo del proceso que lo crea. Los directorios con SGID son una excepción que veremos en la clase 9.

Debian suele crear un grupo con el mismo nombre que cada usuario común. Ese grupo privado organiza pertenencias, pero **no garantiza por sí solo privacidad**: también cuentan los permisos del archivo y de la ruta.

---

<a id="herramientas_para_administrar_cuentas"></a>
### Administrar cuentas

| Necesidad | Herramienta y ejemplo |
| --- | --- |
| Crear una cuenta común | `sudo adduser ana` |
| Crear un grupo | `sudo addgroup desarrollo` |
| Agregar una cuenta a un grupo | `sudo adduser ana desarrollo` |
| Cambiar la contraseña propia | `passwd` |
| Consultar la identidad registrada de una cuenta | `id ana` |

Con la configuración habitual de Debian, `adduser` prepara el home, el grupo del mismo nombre y solicita una contraseña.

Los ejemplos muestran la función de cada herramienta. La creación de Ana, Bruno y el grupo de trabajo se realiza en el laboratorio.

---

<a id="agregar_no_es_reemplazar"></a>
### Agregar no es reemplazar

En documentación también aparece esta forma de agregar una cuenta a un grupo:

```bash
sudo usermod -aG desarrollo ana
```

- `-G` establece la lista de grupos suplementarios.
- `-a` indica que se agregan a las pertenencias existentes.

> Sin `-a`, `-G` reemplaza la lista. Se puede perder una pertenencia importante, como `sudo`.

---

<a id="la_cuenta_cambio_la_sesion_todavia_no"></a>
### Cuenta y sesión

Los grupos de una sesión se cargan al iniciarla. Cambiar la pertenencia registrada no actualiza automáticamente los procesos que ya estaban abiertos.

| Consulta | Qué muestra |
| --- | --- |
| `id` en una sesión de Ana que ya estaba abierta | Los grupos que conserva esa sesión. |
| `id ana` | La información registrada para la cuenta. |
| `id` en una sesión nueva de Ana | Los grupos obtenidos al iniciar esa nueva sesión. |

Por eso alguien puede estar agregado correctamente a un grupo y necesitar **iniciar una sesión nueva** para usar esa pertenencia.

---

<a id="consultas_3"></a>
### Consultas

Grupo principal → grupos suplementarios → cuenta registrada → sesión existente

---

<a id="cuentas_de_servicio"></a>
## Cuentas de servicio

No todas las cuentas representan personas

---

<a id="una_identidad_para_un_servicio"></a>
### Una identidad para un servicio

Cuentas como `www-data` permiten ejecutar tareas del sistema con una identidad específica.

El propósito de la cuenta, su home y su intérprete ayudan a interpretarla. `nologin` es una señal habitual de que no se espera una sesión interactiva; no impide que existan procesos con esa identidad.

> Los UID bajos son frecuentes en cuentas de sistema, pero no alcanzan para identificarlas por sí solos.

---

<a id="menor_privilegio"></a>
### Menor privilegio

Un servicio debe ejecutar cada tarea con los privilegios que necesita. Algunas partes pueden requerir privilegios administrativos y otras ejecutarse con una cuenta dedicada.

Limitar sus permisos reduce el alcance de un fallo o de un compromiso. No garantiza por sí solo que cualquier ataque quede contenido.

Cuando instalemos servicios, comprobaremos **con qué usuario corre cada proceso**.

---

<a id="permisos_tradicionales_de_unix"></a>
## Permisos tradicionales

Unix: owner, grupo y otros (UGO)

---

<a id="tres_conjuntos_de_permisos"></a>
### Tres conjuntos de permisos

Cada archivo tiene un owner y un grupo asociado. Los **permisos tradicionales de Unix** establecen qué puede hacer el owner, qué pueden hacer los miembros del grupo y qué pueden hacer los demás.

En cada conjunto se indican los permisos de lectura, escritura y ejecución: **`r`, `w` y `x`**.

---

<a id="una_linea_de_ls_l"></a>
### Una línea de `ls -l`

```text
-rw-r----- 1 ana desarrollo 18 sep 17 10:00 informe.txt
```

| Parte | Significado |
| --- | --- |
| `-` | Tipo: archivo regular. `d` identifica un directorio y `l` un enlace. |
| `rw-r-----` | Permisos |
| `1` | Cantidad de enlaces; se explicará en almacenamiento. |
| `ana` | Owner. |
| `desarrollo` | Grupo asociado al archivo. |
| `18` | Tamaño en bytes en este ejemplo. |
| Fecha y hora | Última modificación del contenido. |
| `informe.txt` | Nombre. |

---

<a id="ugo_una_ayuda_para_recordar_el_orden"></a>
### UGO: tres conjuntos

**UGO = User / Group / Others.**

| Letra | Nombre | A quién representa |
| --- | --- | --- |
| **U** (`u`) | **User** | El **owner** del archivo. |
| **G** (`g`) | **Group** | El grupo asociado al archivo. |
| **O** (`o`) | **Others** | Los demás usuarios. |

```text
    U     G     O
   rw-   r--   ---
  User group others
```

> En UGO, **user es el owner**; la letra **o corresponde a others**. Estas letras reaparecen en la notación simbólica de `chmod`, que veremos en la clase 9.

---

<a id="rwx_que_operacion_permite_cada_bit"></a>
### Permisos `rwx`

En un archivo regular:

| Bit | Permite |
| --- | --- |
| `r` — read | Leer contenido. |
| `w` — write | Modificar contenido. |
| `x` — execute | Ejecutar, si el formato y las demás condiciones lo permiten. |

Un guion indica que ese bit no está habilitado. Los permisos de los directorios tienen otro significado y se desarrollan en la clase 9.

---

<a id="que_conjunto_se_aplica"></a>
### Qué conjunto se aplica

En este modelo, para un usuario común y un archivo cuya ruta es accesible:

1. Si es el **owner**, se aplican los bits de **U**.
2. Si no es el owner y pertenece al grupo del archivo, se aplican los bits de **G**.
3. En otro caso, se aplican los bits de **O**.

**Los tres conjuntos no se suman.** Se selecciona el que corresponde a esa identidad.

---

<a id="un_ejemplo_para_interpretar"></a>
### Un ejemplo para interpretar

Para el archivo de Ana con grupo `desarrollo` y permisos `rw-r-----`:

```text
-rw-r----- 1 ana desarrollo 18 sep 17 10:00 informe.txt
```

| Cuenta | Conjunto | Lectura | Escritura |
| --- | --- | --- | --- |
| Ana, owner | U: `rw-` | Sí | Sí |
| Bruno, miembro de `desarrollo` | G: `r--` | Sí | No |
| Otro usuario común, fuera del grupo | O: `---` | No | No |

El ejemplo supone que la ruta es accesible.

> **Nota docente:** con el archivo ya preparado, mostrar que Ana puede escribir y Bruno puede leer, pero su escritura produce `Permission denied`. La preparación y la reproducción por los estudiantes quedan en el laboratorio. Preparar un archivo regular sin ACL extendida, con owner Ana y grupo desarrollo. La sesión de Bruno debe incluir ese grupo. El diagnóstico de directorios y los casos especiales quedan para la clase 9.

---

<a id="consultas_4"></a>
### Consultas

Owner → UGO → `rwx` → elegir un conjunto según la identidad

---

<a id="resumen"></a>
### Resumen de la clase

- UID y GID son identificadores numéricos; el sistema resuelve los nombres mediante sus bases de datos.
- `/etc/passwd` describe la cuenta, `/etc/shadow` su información de contraseña y `/etc/group` los grupos.
- `getent` consulta las fuentes configuradas.
- Grupo principal y suplementarios intervienen en el acceso; las sesiones existentes conservan sus grupos.
- Las cuentas de servicio permiten asignar privilegios según la tarea.
- **UGO** recuerda el orden: **user —el owner—, group, others**.
- `rwx` describe las operaciones permitidas; los conjuntos de UGO no se suman.

---

<a id="labs_clase"></a>
### Actividad práctica

[Laboratorio 7 — Usuarios, grupos e identidad](https://github.com/kity-linuxero/linux410-labs/blob/main/lab7/lab7.md)

---

<a id="referencias"></a>
### Referencias técnicas

- [Debian Policy — Usuarios, grupos y rangos](https://www.debian.org/doc/debian-policy/ch-opersys.html#users-and-groups)
- [Debian 13 — adduser(8)](https://manpages.debian.org/trixie/adduser/adduser.8.en.html)
- [Debian 13 — passwd(1)](https://manpages.debian.org/trixie/passwd/passwd.1.en.html)
- [Debian 13 — shadow(5)](https://manpages.debian.org/trixie/passwd/shadow.5.en.html)
- [Debian 13 — Resolución de rutas y permisos](https://manpages.debian.org/trixie/manpages/path_resolution.7.en.html)
