import getpass
import hashlib
import pyperclip

constant = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' * 1000
print('Please input the name of the place where the password is used (should be unique).')
name = input()
while True:
    password = getpass.getpass('Please input your master password.')
    password2 = getpass.getpass('Please input your master password again.')
    if password != password2:
        print('Passwords do not match, please try again.')
    else:
        break


digest = hashlib.sha512()
digest.update(constant.encode('utf-8'))
digest.update(name.encode('utf-8'))
digest.update(password.encode('utf-8'))
output = digest.hexdigest()[:64]
print(output)
try:
    pyperclip.copy(output)
    print('The hash has been copied to your clipboard.')
except:
    pass
