import sys
from pathlib import Path

def write_file_content(file_path: Path, out_file, base_dir: Path, encoding: str = 'utf-8') -> None:
    """Записывает содержимое одного файла в выходной поток с заголовком (относительный путь)."""
    try:
        # Заголовок с относительным путём, чтобы различать файлы из поддиректорий
        rel_path = file_path.relative_to(base_dir)
        out_file.write(f"\n--- {rel_path} ---\n")
        
        with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
            for line in f:
                out_file.write(line)
    except Exception as e:
        # Запись ошибки в stderr (не в выходной файл)
        print(f"Ошибка обработки {file_path}: {e}", file=sys.stderr)

def main():
    # Параметры (можно изменить под свои нужды)
    output_filename = "directory_dump.txt"   # Имя файла для сохранения
    recursive = True                          # Обходить поддиректории?
    encoding = "utf-8"                         # Кодировка чтения файлов

    base_dir = Path.cwd()
    output_path = base_dir / output_filename

    # Открываем выходной файл для записи (перезаписываем, если существует)
    try:
        with open(output_path, 'w', encoding='utf-8') as out_file:
            # Выбираем метод обхода
            if recursive:
                items = base_dir.rglob('*')
            else:
                items = base_dir.iterdir()

            for item in items:
                if item.is_file():
                    # Пропускаем сам выходной файл, чтобы избежать его повторного включения
                    if item.samefile(output_path):
                        continue
                    write_file_content(item, out_file, base_dir, encoding)

        print(f"Содержимое директории сохранено в файл: {output_path}", file=sys.stderr)
    except Exception as e:
        print(f"Ошибка при создании выходного файла: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()