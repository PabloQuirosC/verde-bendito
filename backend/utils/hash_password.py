"""
Script para generar hash de contraseña usando bcrypt
Útil para agregar usuarios directamente en la base de datos
"""
import os
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Genera un hash bcrypt de la contraseña"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si una contraseña coincide con el hash"""
    return pwd_context.verify(plain_password, hashed_password)

if __name__ == "__main__":
    password = os.getenv("EXAMPLE_PASSWORD")
    if not password:
        raise SystemExit("Defina EXAMPLE_PASSWORD para generar el hash de ejemplo.")

    hashed = hash_password(password)
    is_valid = verify_password(password, hashed)

    print("Se ha generado un hash bcrypt para la contraseña de ejemplo.")
    print("La verificación del hash se realizó correctamente.")
    print(f"Estado de verificación: {'válida' if is_valid else 'inválida'}")

    print("\nEjemplos de INSERT para MySQL:")
    print("INSERT INTO usuarios (usuario, contraseña, correo_electronico, nombre_completo, status) VALUES")
    print("('admin', '<hash-generado>', 'admin@inmocr.com', 'Administrador', 'activo');")
