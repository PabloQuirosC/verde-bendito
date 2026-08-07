"""
Script para generar hash de contraseña usando bcrypt
Útil para agregar usuarios directamente en la base de datos
"""
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Genera un hash bcrypt de la contraseña"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si una contraseña coincide con el hash"""
    return pwd_context.verify(plain_password, hashed_password)

if __name__ == "__main__":
    # Generar hash para la contraseña "admin123"
    password = "admin123"
    hashed = hash_password(password)
    
    print(f"Contraseña original: {password}")
    print(f"Hash generado: {hashed}")
    print(f"\nVerificación: {verify_password(password, hashed)}")
    
    print("\nEjemplos de INSERT para MySQL:")
    print(f"INSERT INTO usuarios (usuario, contraseña, correo_electronico, nombre_completo, status) VALUES")
    print(f"('admin', '{hashed}', 'admin@inmocr.com', 'Administrador', 'activo');")
