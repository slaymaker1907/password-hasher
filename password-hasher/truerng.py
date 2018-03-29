import secrets

with open('./google-10000-english-usa.txt') as f:
    def process_word(word):
        word = word.strip()
        return word[0].upper() + word[1:].lower()
    words = [process_word(word) for word in f.read().strip().split()]
secret_word = lambda: secrets.choice(words)
size = 8
pass_words = [secret_word() for i in range(size)]
print(''.join(pass_words))
