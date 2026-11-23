export function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'Неверный email или пароль',
    'User already registered': 'Этот email уже зарегистрирован',
    'already been registered': 'Этот email уже зарегистрирован',
    'Password should be at least 6 characters': 'Пароль должен быть не короче 6 символов',
    'Unable to validate email address: invalid format': 'Некорректный формат email',
    'Email not confirmed': 'Подтвердите email по ссылке из письма',
    'New password should be different from the old password.':
      'Новый пароль должен отличаться от старого',
    'you can only request this after':
      'Слишком много попыток. Подождите минуту и попробуйте снова',
    'For security purposes': 'Слишком много попыток. Подождите минуту и попробуйте снова',
    'permission denied for table': 'Нет доступа к базе данных. Запустите миграцию 002_grants.sql в Supabase',
    '42501': 'Нет доступа к базе данных. Запустите миграцию 002_grants.sql в Supabase',
    'Only the project owner can delete this project': 'Удалить проект может только владелец',
    'Could not find the function': 'Запустите в Supabase миграцию 007_delete_wedding_project_rpc.sql',
    delete_wedding_project: 'Запустите в Supabase миграцию 007_delete_wedding_project_rpc.sql',
  }

  for (const [key, value] of Object.entries(map)) {
    if (message.includes(key)) return value
  }

  return message
}

/** Аккаунт создан, но вход возможен только после подтверждения email. */
export function isEmailAlreadyRegisteredError(message: string): boolean {
  return (
    message.includes('User already registered') ||
    message.includes('already been registered')
  )
}

export function isRateLimitError(message: string): boolean {
  return (
    message.includes('you can only request this after') ||
    message.includes('For security purposes')
  )
}
