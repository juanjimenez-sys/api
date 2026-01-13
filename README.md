# Task Management API

API para la gestión de tareas y usuarios. Permite a los usuarios autenticarse, registrar cuentas y gestionar tareas mediante operaciones CRUD (Crear, Leer, Actualizar y Eliminar).

---

## **Características**

### **Autenticación de Usuarios**
- Registro de usuarios.
- Inicio de sesión con generación de tokens JWT para autenticación segura.

### **Gestión de Tareas**
- Autenticación requerida para utilizar la API.
- Operaciones CRUD: Crear, leer, actualizar y eliminar tareas.
- Validación de datos para garantizar entradas correctas.
- Verificación de permisos para editar y eliminar tareas.

---

## **Requisitos Previos**

1. Tener instalado **Node.js** v14+.
2. Tener una instancia de **MongoDB** configurada (local o en la nube).
3. Instalar las dependencias del proyecto con el siguiente comando:
   ```bash
   npm install
