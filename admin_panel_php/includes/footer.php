      </main> <!-- End .page-body -->
    </div> <!-- End .main-content -->
  </div> <!-- End .admin-layout -->

  <!-- Global Modal Container for dynamically injected overlays -->
  <div id="globalModalContainer"></div>

  <!-- Main Application JavaScript -->
  <script src="<?= ADMIN_BASE_URL ?>/assets/js/app.js?v=<?= @filemtime(__DIR__ . '/../assets/js/app.js') ?: time() ?>"></script>
  <script>
    // Initialize Lucide Icons on document load
    if (window.lucide) {
      window.lucide.createIcons();
    }
  </script>
</body>
</html>
