def validar_cpf(cpf: str) -> bool:
    """Valida CPF usando algoritmo de dígitos verificadores."""
    cpf = "".join(filter(str.isdigit, cpf))

    if len(cpf) != 11:
        return False

    if cpf == cpf[0] * 11:
        return False

    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    resto = (soma * 10) % 11
    d1 = 0 if resto == 10 else resto

    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    resto = (soma * 10) % 11
    d2 = 0 if resto == 10 else resto

    return int(cpf[9]) == d1 and int(cpf[10]) == d2


def formatar_cpf(cpf: str) -> str:
    cpf = "".join(filter(str.isdigit, cpf))
    return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
