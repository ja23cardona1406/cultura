# Sistema de Gestión de Usuarios con Supabase

Este proyecto implementa un sistema de gestión de usuarios utilizando React, TypeScript, y Supabase como backend. El sistema permite a los administradores crear, editar y eliminar usuarios, así como asignar diferentes roles.

## Configuración de Supabase

Para configurar la base de datos en Supabase:

1. Crea una cuenta en [Supabase](https://supabase.com/) si aún no tienes una
2. Crea un nuevo proyecto
3. Ve a la sección SQL Editor y ejecuta el script en `supabase-setup.sql`
4. Copia tus credenciales de Supabase (URL y Anon Key) al archivo `.env`

## Características

- Listado de usuarios con información de perfil
- Creación de usuarios con contraseñas seguras generadas automáticamente
- Edición de usuarios (nombre y rol)
- Eliminación de usuarios con confirmación
- Manejo de diferentes roles (admin, dian, institucion, user)
- Interfaz de usuario responsive y moderna
- Manejo de errores y estados de carga
- Integración con Supabase Auth y Database

## Estructura del Proyecto

- `src/components/UserManagement.tsx`: Componente principal para la gestión de usuarios
- `src/components/modals/`: Componentes para los modales de creación y edición
- `src/context/SupabaseContext.tsx`: Contexto para la integración con Supabase
- `supabase-setup.sql`: Script SQL para configurar la base de datos en Supabase

## Desarrollo

Para ejecutar el proyecto en modo desarrollo:

```bash
npm run dev
```

## Implementación

Para construir el proyecto para producción:

```bash
npm run build
```

## Seguridad

El sistema utiliza Row Level Security (RLS) de Supabase para garantizar que solo los usuarios autorizados puedan realizar ciertas operaciones. Las políticas incluyen:

- Solo usuarios autenticados pueden ver la lista de usuarios
- Los usuarios solo pueden actualizar su propia información
- Los administradores pueden actualizar y eliminar a cualquier usuario