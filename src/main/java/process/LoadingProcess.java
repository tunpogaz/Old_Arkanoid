package process;

import java.net.URL;
import javafx.application.Platform;
import javafx.scene.Scene;
import javafx.scene.layout.StackPane;
import javafx.scene.media.Media;
import javafx.scene.media.MediaPlayer;
import javafx.scene.media.MediaView;
import javafx.stage.Stage;

public class LoadingProcess {
  private final int width;
  private final int height;

  public LoadingProcess(int width, int height) {
    this.width = width;
    this.height = height;
  }

  public void render(Stage primaryStage, Runnable onFinished) {
    try {
      URL resource = getClass().getResource("/video/intro.mp4");
      if (resource == null) {
        throw new Exception("Không tìm thấy file video intro.mp4");
      }

      Media media = new Media(resource.toExternalForm());
      MediaPlayer mediaPlayer = new MediaPlayer(media);
      MediaView mediaView = new MediaView(mediaPlayer);

      mediaView.fitWidthProperty().bind(primaryStage.widthProperty());
      mediaView.fitHeightProperty().bind(primaryStage.heightProperty());

      StackPane videoRoot = new StackPane(mediaView);
      Scene videoScene = new Scene(videoRoot, width, height);
      mediaPlayer.setRate(5.0);
      mediaPlayer.setOnEndOfMedia(() -> {
        mediaPlayer.dispose();
        Platform.runLater(onFinished);
      });

      primaryStage.setTitle("Arkanoid");
      primaryStage.setScene(videoScene);
      primaryStage.show();
      mediaPlayer.play();

    } catch (Exception e) {
      System.err.println("Lỗi khi tải video: " + e.getMessage());
      System.err.println("Bắt đầu game ngay lập tức...");
      Platform.runLater(onFinished);
    }
  }
}
