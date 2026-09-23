# Intranet des agents · Ville du Lamentin

Le site conserve la page d'accueil, l'annuaire 3CX et les documents de la maquette. Les actualités sont enregistrées dans la base du site et chargées par l'API.

## Gestion des actualités

Ouvrir `/admin.html` depuis le lien « Gérer les actualités » de l'accueil. Le formulaire permet de publier, enregistrer un brouillon, modifier et supprimer. La rubrique et la date déterminent l'affichage du carrousel. Un lien facultatif ajoute « En savoir plus ». On peut joindre jusqu'à quatre photos JPEG, PNG ou WebP de 8 Mo chacune, lors de la création ou de la modification, puis les retirer individuellement.

Le propriétaire gère, depuis la même page, les adresses e-mail autorisées à publier. Le serveur vérifie les droits à chaque affichage de la page et à chaque écriture. Le propriétaire conserve toujours son accès et peut retirer les autres gestionnaires. L'accès général à la démonstration reste limité au propriétaire dans Sites : une adresse ajoutée comme gestionnaire doit également obtenir l'accès au Site pour s'en servir. Pour une installation sur le réseau municipal, il faudra remplacer cette identification ChatGPT par l'authentification et les habilitations de la collectivité, puis migrer la base d'actualités.

## Développement

`npm run db:generate` génère les migrations Drizzle à partir de `db/schema.ts`. Le déploiement Sites applique les migrations de `drizzle/` à la base D1. Les métadonnées des photos sont en D1 et les fichiers dans le compartiment R2 privé ; la route de lecture vérifie la publication de l'actualité. Le code de la page d'accueil se trouve dans `intranet/index.html` et ses ressources dans `public/`.
