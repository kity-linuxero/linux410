<a id="inicio"></a>

# Administración de servidores GNU/Linux

## Clase 9: Permisos y propiedad

Módulo 1 — Operación de Sistemas Operativos GNU/Linux

---

<a id="index"></a>

### Temas de la clase 9

- [Permisos en archivos y directorios](#archivos_y_directorios)
- [Modificación de permisos, owner y grupo](#cambiar_permisos_y_propiedad)
- [Diagnóstico de una ruta](#diagnosticar_el_acceso)
- [Permisos de creación: umask](#permisos_de_creacion)
- [SGID en directorios y bit sticky](#directorios_compartidos)
- [Actividad práctica — Laboratorio 8](#labs_clase)

[Exportar a PDF](../clase9.html?print-pdf)

---

<a id="objetivos_de_la_clase"></a>

### Objetivos de la clase

Al finalizar vas a poder:

- Explicar por qué una operación recibe «Permiso denegado».
- Cambiar permisos y propiedad según la necesidad.
- Distinguir editar un archivo de borrarlo.
- Configurar y verificar un directorio de trabajo compartido.

---

<a id="retomamos_la_clase_8"></a>

### Retomamos la clase 8

```text
-rw-r----- 1 ana desarrollo ... informe.txt
```

- Ana puede leer y escribir como owner.
- Bruno puede leer por el grupo desarrollo.
- Un usuario ajeno al grupo no tiene acceso al contenido.

La ruta debe ser accesible y las sesiones deben tener los grupos correspondientes.

> **Nota docente:** el archivo anterior está en `/srv/laboratorio-clase8`. Conservarlo. Los ejemplos nuevos se preparan en un espacio separado; los bloques de esta presentación ilustran conceptos, no son una guía consecutiva de ejecución.

---

<a id="los_permisos_del_propietario_y_del_grupo_no_se_suman"></a>

### Los permisos del propietario y del grupo no se suman

```text
-r--rw---- 1 ana desarrollo ... informe.txt
```

| Cuenta | Se aplica | ¿Puede escribir? |
| --- | --- | --- |
| Ana, owner | U: r-- | No |
| Bruno, miembro de desarrollo | G: rw- | Sí |

**Los conjuntos no se suman.**

> **Nota docente:** ejemplo sin ACL extendida y con la ruta accesible. Ana puede cambiar el modo como owner; eso no significa que el modo actual le permita escribir.

---

<a id="archivos_y_directorios"></a>

## Archivos y directorios

La misma letra permite operaciones diferentes.

---

<a id="permisos_en_un_archivo"></a>

### Permisos en un archivo

| Bit | Operación |
| --- | --- |
| r | Leer contenido |
| w | Modificar contenido |
| x | Ejecutar, si el formato y las demás condiciones lo permiten |

El permiso de escritura **no decide por sí solo si podemos borrar el archivo**.

---

<a id="permisos_en_un_directorio"></a>

### Permisos en un directorio

| Bit | Operación |
| --- | --- |
| r | Leer la lista de nombres |
| w | Modificar entradas, junto con x |
| x | Buscar nombres y atravesar el directorio |

Crear, borrar y renombrar requieren normalmente **w + x en el directorio padre**.

> **Nota docente:** el bit sticky y otros controles pueden restringir esas operaciones. Para renombrar entre directorios se consideran ambos padres.

---

<a id="listar_no_es_atravesar"></a>

### Listar no es atravesar

**Atravesar un directorio es usarlo como parte de una ruta para llegar a un archivo o subdirectorio.** Por ejemplo, abrir `/srv/equipo/informe.txt` requiere `x` en `/`, `/srv` y `/srv/equipo`, aunque no entremos antes con `cd`.

| Permisos disponibles | Qué podemos hacer |
| --- | --- |
| r sin x | Obtener nombres; no acceder a esos objetos por esa ruta |
| x sin r | Acceder a un nombre conocido, si sus permisos lo permiten; no enumerar el directorio |
| r + x | Listar y buscar; cada archivo conserva sus permisos |

> **Nota docente:** mostrar la diferencia con un directorio de prueba. `ls -l` necesita resolver los nombres para obtener sus metadatos; con r sin x puede mostrar errores aunque sea posible listar nombres.

---

<a id="leer_requiere_una_ruta_accesible"></a>

### Leer requiere una ruta accesible

```text
/srv/equipo/informe.txt
```

Para abrir `informe.txt` necesitamos:

- **x** en `/`, `/srv` y `/srv/equipo`.
- **r** en `informe.txt` para leerlo.

Un archivo legible puede quedar inaccesible por un directorio intermedio.

---

<a id="editar_y_borrar_son_operaciones_distintas"></a>

### Editar y borrar son operaciones distintas

| Operación | Dónde miramos |
| --- | --- |
| Agregar una línea | Escritura en el archivo y búsqueda en la ruta |
| Crear un archivo | Escritura y búsqueda en el directorio padre |
| Borrar un nombre | Escritura y búsqueda en el padre, más las restricciones aplicables |

Ana puede borrar `prueba2.txt` de Bruno si tiene **w+x en `/srv/prueba`** y no hay una restricción adicional. `rm` quita el nombre del directorio; el owner del archivo no decide por sí solo.

Para verificarlo: `id` y `ls -ld /srv/prueba`. El bit sticky puede limitar el borrado.

---

<a id="consultas"></a>

### Consultas

- ¿Qué falta si puedo listar nombres pero no abrir los archivos?
- ¿Por qué quitar w de un archivo no garantiza que nadie lo borre?

---

<a id="cambiar_permisos_y_propiedad"></a>

## Cambiar permisos y propiedad

Definir quién necesita hacer qué.

---

<a id="chmod_forma_simbolica"></a>

### chmod: forma simbólica

```bash
chmod +x script.sh       # Agregar ejecución
chmod +w informe.txt     # Agregar escritura
chmod g+w informe.txt    # Agregar escritura al grupo
chmod u=rw,g=r,o= informe.txt
```

| Parte | Significado |
| --- | --- |
| u, g, o, a | Owner, grupo, otros, todos |
| + | Agregar |
| - | Quitar |
| = | Establecer |

Sin `u`, `g`, `o` o `a`, **la umask filtra qué bits se modifican**. `+w` no siempre equivale a `a+w`.

> **Nota docente:** ejemplos independientes como owner. Con umask 022, +x agrega x a U/G/O; +w agrega w solo a U. Con a+w se solicita escritura para U/G/O sin ese filtro. Anticipar esta diferencia y retomarla al explicar umask.

---

<a id="de_tres_bits_a_un_digito_octal"></a>

### De tres bits a un dígito octal

Cada permiso es un bit: **1 = habilitado · 0 = deshabilitado**. Las posiciones de `rwx` valen **2² = 4, 2¹ = 2 y 2⁰ = 1**.

| Permisos | r · 4 | w · 2 | x · 1 | Suma de los valores activos | Octal |
| --- | --- | --- | --- | --- | --- |
| `---` | 0 | 0 | 0 | 0 | **0** |
| `--x` | 0 | 0 | 1 | 1 | **1** |
| `-w-` | 0 | 1 | 0 | 2 | **2** |
| `-wx` | 0 | 1 | 1 | 2 + 1 | **3** |
| `r--` | 1 | 0 | 0 | 4 | **4** |
| `r-x` | 1 | 0 | 1 | 4 + 1 | **5** |
| `rw-` | 1 | 1 | 0 | 4 + 2 | **6** |
| `rwx` | 1 | 1 | 1 | 4 + 2 + 1 | **7** |

**`rw-` → `110₂` → 1×4 + 1×2 + 0×1 → `6₈`**

Tres bits tienen ocho combinaciones: cada grupo U, G u O se representa con un dígito octal de **0 a 7**.

> **Nota docente:** recorrer la fila rw-: se suman los valores de las posiciones activas, no los unos. Repetir con r-x y enlazar con los tres grupos de `chmod 640` en la siguiente diapositiva.

---

<a id="chmod_forma_octal"></a>

### chmod: forma octal

**r = 4 · w = 2 · x = 1**

```text
rw- = 4 + 2 = 6
r-x = 4 + 1 = 5
rwx = 4 + 2 + 1 = 7
--- = 0
```

Tres dígitos: **U · G · O**.

```bash
chmod 640 informe.txt
```

Owner: rw- · Grupo: r-- · Otros: ---

---

<a id="interpretar_antes_de_aplicar"></a>

### Interpretar antes de aplicar

| Modo | Permisos | Uso ilustrativo |
| --- | --- | --- |
| 600 | rw------- | Archivo privado |
| 640 | rw-r----- | Archivo legible por el grupo |
| 660 | rw-rw---- | Archivo editable por el grupo |
| 750 | rwxr-x--- | Directorio consultable por el grupo |
| 770 | rwxrwx--- | Directorio modificable por el grupo |

El acceso también depende de la identidad y de la ruta.

---

<a id="quien_puede_cambiar_los_permisos"></a>

### Quién puede cambiar los permisos

Puede hacerlo el **owner** o un proceso con los privilegios necesarios.

Poder escribir por el grupo no convierte a Bruno en owner.

```bash
ls -l informe.txt
chmod g+w informe.txt
ls -l informe.txt
```

Inspeccionar → cambiar → verificar.

> **Nota docente:** ejecutar como owner. Evitar cambios recursivos generales; el mismo modo no siempre sirve para archivos y directorios.

---

<a id="chmod_cambios_recursivos"></a>

### chmod: cambios recursivos

```bash
chmod -R g+w proyecto
```

**`-R` aplica el cambio al directorio y a todo su contenido**, incluidos archivos ocultos y subdirectorios.

El ejemplo agrega escritura al grupo; no cambia owner ni grupo.

Un mismo modo numérico puede no servir para todo: `660` deja directorios sin búsqueda; `770` vuelve ejecutables los archivos de datos.

> **Nota docente:** usar un árbol de práctica propio. Revisar la ruta y los permisos antes de aplicar el cambio. Poder escribir en el directorio no autoriza a cambiar los permisos de archivos ajenos.

---

<a id="x_mayuscula_directorios_y_ejecutables"></a>

### X mayúscula: directorios y ejecutables

```bash
chmod -R g+rwX proyecto
```

| Objeto | Qué agrega al grupo |
| --- | --- |
| Directorio | Lectura, escritura y búsqueda (`rwx`) |
| Archivo sin ejecución | Lectura y escritura (`rw`) |
| Archivo que ya tiene algún bit de ejecución | Lectura, escritura y ejecución (`rwx`) |

**`X` no vuelve ejecutables todos los archivos.** Este comando agrega permisos; conserva los demás.

> **Nota docente:** `X` evalúa si es directorio o si ya hay ejecución en U, G u O. No elimina ejecución existente ni fija modos exactos. El resultado depende de los permisos iniciales; el laboratorio parte de directorios 2700 y un archivo 600.

---

<a id="chown_y_chgrp"></a>

### chown y chgrp

Desde la cuenta administradora:

```bash
sudo chown ana informe.txt
sudo chgrp desarrollo informe.txt
sudo chown ana:desarrollo informe.txt
```

- `chown`: cambiar owner; también admite owner y grupo juntos.
- `chgrp`: cambiar el grupo.
- Ninguno reemplaza a `chmod`.

> **Nota docente:** son alternativas ilustrativas. Transferir owner requiere privilegios; el owner puede cambiar el grupo a uno del que sea miembro. Asignar desarrollo al directorio no modifica archivos que ya existen dentro.

---

<a id="consultas_2"></a>

### Consultas

- ¿Qué diferencia hay entre `chmod g+w` y `chgrp desarrollo`?
- ¿Bruno puede cambiar el modo de un archivo de Ana solo porque puede escribirlo?

---

<a id="diagnosticar_el_acceso"></a>

## Diagnosticar el acceso

Primero identificar la operación y la sesión.

---

<a id="una_ruta_completa"></a>

### Una ruta completa

```bash
id
ls -l /srv/equipo/informe.txt
ls -ld /srv/equipo
namei -l /srv/equipo/informe.txt
```

- `id`: identidad y grupos de esta sesión.
- `ls -l`: datos del archivo.
- `ls -ld`: datos del directorio mismo.
- `namei -l`: componentes y permisos de la ruta.

> **Nota docente:** `namei` ayuda a localizar restricciones; no evalúa todos los controles. Repetir la operación desde la sesión del usuario afectado después de corregirla.

---

<a id="una_correccion_con_alcance_concreto"></a>

### Una corrección con alcance concreto

Si Bruno necesita escribir un informe del grupo:

1. Comprobar que su sesión tenga desarrollo.
2. Revisar el grupo del archivo y el acceso a la ruta.
3. Como owner, agregar la escritura necesaria con `chmod g+w`.
4. Probar nuevamente como Bruno.

Dar `777` abre permisos a otros usuarios y puede ocultar la causa del problema.

---

<a id="permisos_de_creacion"></a>

## Permisos de creación

¿Con qué permisos nace un archivo?

---

<a id="umask_decidir_como_nacen_los_archivos"></a>

### umask: decidir cómo nacen los archivos

Ana crea un informe nuevo y Bruno necesita editarlo. Si nace con `644`, el grupo solo puede leerlo.

**Umask permite definir permisos de creación adecuados sin corregir cada archivo después.**

```bash
umask       # Consultar la máscara de esta shell
umask 007   # Quitar los permisos de otros al crear
```

`chmod` cambia un archivo existente; `umask` limita los permisos solicitados para los nuevos.

> **Nota docente:** cambiar umask no altera archivos existentes. Para compartir escritura, el archivo debe tener también el grupo adecuado; lo resolveremos con SGID en directorios.

---

<a id="ejemplos_habituales"></a>

### Ejemplos habituales

Para creaciones habituales que solicitan 666 en archivos y 777 en directorios:

| umask | Archivo | Directorio |
| --- | --- | --- |
| 022 | 644 | 755 |
| 002 | 664 | 775 |
| 007 | 660 | 770 |
| 077 | 600 | 700 |

En **007**, cada dígito indica qué quitar: U → nada, G → nada, O → todo.

Para nuestro equipo: archivos nuevos `660`, con escritura para el grupo adecuado.

En Debian, Ubuntu... por ejemplo con `umask`, suele verse `0002`.

> **Nota docente:** ejemplo sin ACL predeterminada. No enseñar la máscara como una resta general; se quitan bits. Un programa que solicita 600 no se convierte en 660 por usar 007.

---

<a id="directorios_compartidos"></a>

## Directorios compartidos

Conservar el grupo y controlar el borrado.

---

<a id="sgid_en_un_directorio"></a>

### SGID en un directorio

Con el directorio ya creado, desde la cuenta administradora:

```bash
sudo chown root:desarrollo /srv/equipo
sudo chmod 2770 /srv/equipo
ls -ld /srv/equipo
```

Permisos esperados:

```text
drwxrws---
```

El **2** activa SGID: los objetos nuevos toman el grupo del directorio.

---

<a id="sgid_y_umask_trabajan_juntos"></a>

### SGID y umask trabajan juntos

| Configuración | Qué resuelve |
| --- | --- |
| Grupo desarrollo | Qué grupo comparte el espacio |
| Directorio 2770 | Acceso grupal y grupo de objetos nuevos |
| umask 007 en ambas sesiones | Conserva escritura grupal solicitada y quita permisos a otros |

Con creaciones habituales, los archivos nuevos quedan con grupo desarrollo y modo 660.

**SGID no agrega escritura por sí solo.**

> **Nota docente:** no modifica archivos existentes. Un archivo movido desde otro directorio puede conservar su grupo y modo; no confundir mover con crear.

---

<a id="consultas_3"></a>

### Consultas

- ¿Por qué SGID no garantiza que Bruno pueda editar cada archivo nuevo?

---

<a id="resumen_de_la_clase"></a>

### Resumen de la clase

- Identidad y UGO determinan qué permisos se evalúan.
- Archivos y directorios controlan operaciones diferentes.
- `chmod` cambia permisos; `chown` y `chgrp`, propiedad.
- `namei -l` ayuda a revisar toda la ruta.
- Umask limita permisos de creación; SGID conserva el grupo.
- El bit sticky restringe el borrado de archivos ajenos en directorios compartidos.

---

<a id="labs_clase"></a>

### Actividad práctica — Laboratorio 8

**Objetivo:** dejar funcionando un directorio compartido entre Ana y Bruno.

- Preparar Ana, Bruno y desarrollo si faltan; reutilizarlos si ya existen.
- Configurar grupo, permisos y SGID del directorio.
- Crear archivos con permisos adecuados desde ambas sesiones.
- Comprobar lectura, escritura y rechazo a usuarios ajenos.

[Laboratorio 8 — Permisos y directorios compartidos](https://github.com/kity-linuxero/linux410-labs/blob/main/lab8/lab8.md)

> **Nota docente:** Guía independiente del Laboratorio 7, con preparación inicial de cuentas y grupo si faltan. Reservar aproximadamente una hora, más la preparación para quienes la necesiten.

---

<a id="referencias"></a>

### Referencias

- [GNU Coreutils: chmod](https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html), [chown](https://www.gnu.org/software/coreutils/manual/html_node/chown-invocation.html) y [chgrp](https://www.gnu.org/software/coreutils/manual/html_node/chgrp-invocation.html).
- [Linux: permisos y bits especiales](https://man7.org/linux/man-pages/man7/inode.7.html).
- [Linux: umask](https://man7.org/linux/man-pages/man2/umask.2.html).
- Ayuda local: `man namei`, `help umask`.
