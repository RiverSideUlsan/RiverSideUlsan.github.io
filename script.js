const menu = document.querySelector('.menu');
const navigation = document.querySelector('nav');

if (menu && navigation) {
  menu.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('open');

    menu.setAttribute('aria-expanded', String(isOpen));
    menu.textContent = isOpen ? 'Close' : 'Menu';
  });
}
