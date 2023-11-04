let
    # Import Nix Packages
    pkgs = import <nixpkgs> {};

    # buildInputs = Packages that build with /bin output folder
    buildInputs = with pkgs; [
        nodejs_20
    ];

    # Custom mkShell derivative that inherit all packages and hooks
    mkShell = shellHook: pkgs.mkShell {
        name = "firewalld-api-nix";
        inherit buildInputs shellHook;
    };
in
    # Use: nix-shell -A <env>
    {
        # Developer Environment
        dev = mkShell "";

        # Install script
        # Use `set -e` to make it exit from the env.
        install = mkShell ''
            set -e

            # Prepare package manager
            corepack enable
            corepack prepare pnpm@latest

            # Install packages
            pnpm install

            exit
        '';

        # Run Script
        run = mkShell ''
            set -e
            # CTRL+C = 130 = SIGINT
            # We will trap this
            exec pnpm start
        '';
    }